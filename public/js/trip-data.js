// Données de référence partagées entre le client (public/js/app.js, via <script>) et le
// serveur (server.js/lib/trip-engine.js, via require()) — pays couverts, moteur de transport,
// tables de péage/ferry/budget/masse continentale. Extrait de app.js lors du passage de la
// recherche de ville et du tirage aléatoire côté serveur (voir README, section "Recherche et
// tirage aléatoire côté serveur") : ces tables étaient auparavant déclarées uniquement côté
// client ; les dupliquer côté serveur aurait créé un risque de désynchronisation à chaque futur
// ajout de pays (exactement le genre de duplication "à surveiller à la main" déjà présente entre
// scripts/build-country-communes.js et scripts/build-aliases.js, ici évité).
//
// Format UMD minimal : module.exports si présent (Node/serveur), sinon window.TripData
// (navigateur — chargé via <script src="js/trip-data.js"> AVANT app.js dans index.html).
// Aucune dépendance à d'autres fichiers du projet : pur JSON-like, aucun appel à t()/tl() (i18n)
// ni à aucune donnée d'exécution (COMMUNES, FEATURED...) — aucune des deux parties n'a besoin de
// charger quoi que ce soit d'autre pour utiliser ce fichier.
(function(root, factory){
  if(typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.TripData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

    var COUNTRIES = {
      FR: { code:'FR', name:'France', file:'communes.txt', hasToll:true },
      AD: { code:'AD', name:'Andorre', file:'communes-ad.txt', hasToll:false, aliasFile:'aliases-ad.txt' },
      ES: { code:'ES', name:'Espagne', file:'communes-es.txt', hasToll:true, aliasFile:'aliases-es.txt' },
      PT: { code:'PT', name:'Portugal', file:'communes-pt.txt', hasToll:true, aliasFile:'aliases-pt.txt' },
      BE: { code:'BE', name:'Belgique', file:'communes-be.txt', hasToll:false, aliasFile:'aliases-be.txt' },
      NL: { code:'NL', name:'Pays-Bas', file:'communes-nl.txt', hasToll:false, aliasFile:'aliases-nl.txt' },
      LU: { code:'LU', name:'Luxembourg', file:'communes-lu.txt', hasToll:false, aliasFile:'aliases-lu.txt' },
      CH: { code:'CH', name:'Suisse', file:'communes-ch.txt', hasToll:false, aliasFile:'aliases-ch.txt', currency:'CHF',
        vignette:{ url:'https://via.admin.ch/shop/' } },
      DE: { code:'DE', name:'Allemagne', file:'communes-de.txt', hasToll:false, aliasFile:'aliases-de.txt' },
      IT: { code:'IT', name:'Italie', file:'communes-it.txt', hasToll:true, aliasFile:'aliases-it.txt' },
      AT: { code:'AT', name:'Autriche', file:'communes-at.txt', hasToll:false, aliasFile:'aliases-at.txt',
        vignette:{ url:'https://shop.asfinag.at/en/' } },
      SM: { code:'SM', name:'Saint-Marin', file:'communes-sm.txt', hasToll:false, aliasFile:'aliases-sm.txt' },
      LI: { code:'LI', name:'Liechtenstein', file:'communes-li.txt', hasToll:false, aliasFile:'aliases-li.txt', currency:'CHF' },
      MC: { code:'MC', name:'Monaco', file:'communes-mc.txt', hasToll:false, aliasFile:'aliases-mc.txt' },
      MT: { code:'MT', name:'Malte', file:'communes-mt.txt', hasToll:false, aliasFile:'aliases-mt.txt' },
      GG: { code:'GG', name:'Guernesey', file:'communes-gg.txt', hasToll:false, aliasFile:'aliases-gg.txt', currency:'GBP' },
      JE: { code:'JE', name:'Jersey', file:'communes-je.txt', hasToll:false, aliasFile:'aliases-je.txt', currency:'GBP' },
      CZ: { code:'CZ', name:'République tchèque', file:'communes-cz.txt', hasToll:false, aliasFile:'aliases-cz.txt', currency:'CZK',
        vignette:{ url:'https://edalnice.gov.cz/en/simple-purchase' } },
      PL: { code:'PL', name:'Pologne', file:'communes-pl.txt', hasToll:false, aliasFile:'aliases-pl.txt', currency:'PLN' },
      SK: { code:'SK', name:'Slovaquie', file:'communes-sk.txt', hasToll:false, aliasFile:'aliases-sk.txt',
        vignette:{ url:'https://eznamka.sk/selfcare/purchase' } },
      HU: { code:'HU', name:'Hongrie', file:'communes-hu.txt', hasToll:false, aliasFile:'aliases-hu.txt', currency:'HUF',
        vignette:{ url:'https://ematrica.nemzetiutdij.hu/' } },
      SI: { code:'SI', name:'Slovénie', file:'communes-si.txt', hasToll:false, aliasFile:'aliases-si.txt',
        vignette:{ url:'https://evinjeta.dars.si/' } },
      HR: { code:'HR', name:'Croatie', file:'communes-hr.txt', hasToll:true, aliasFile:'aliases-hr.txt' },
      BA: { code:'BA', name:'Bosnie-Herzégovine', file:'communes-ba.txt', hasToll:true, aliasFile:'aliases-ba.txt', currency:'BAM' },
      GB: { code:'GB', name:'Royaume-Uni', file:'communes-gb.txt', hasToll:false, aliasFile:'aliases-gb.txt', currency:'GBP' },
      IE: { code:'IE', name:'Irlande', file:'communes-ie.txt', hasToll:false, aliasFile:'aliases-ie.txt' },
      IM: { code:'IM', name:'Île de Man', file:'communes-im.txt', hasToll:false, aliasFile:'aliases-im.txt', currency:'GBP' },
      // Danemark : hasToll:false — pas de vignette (contrairement à la Suisse/l'Autriche/la
      // République tchèque/la Slovaquie/la Hongrie/la Slovénie), pas de barème €/km non plus (contrairement
      // à la France/l'Espagne/l'Italie/la Croatie/la Bosnie-Herzégovine). Deux VRAIS ponts à péage relient
      // les trois masses continentales du pays — le Storebæltsbroen/Great Belt (Fionie-Sjælland, ~205-235
      // DKK selon le mode de paiement, storebaelt.dk) et l'Øresundsbron vers la Suède (~465-470 DKK,
      // oresundsbron.com) — mais tous deux à tarif FIXE par passage, jamais proportionnel à la distance
      // parcourue : même traitement que les ouvrages isolés déjà laissés hors modèle ailleurs (M50 irlandais,
      // Kiltunnel néerlandais, M6 Toll/Dartford Crossing britanniques, tunnel du Grand-Saint-Bernard suisse)
      // — non modélisés ici, malgré le fait que le Storebælt, contrairement à ces exemples, est une
      // traversée bien plus difficile à éviter pour un trajet Jylland/Fionie <-> Sjælland/Copenhague (aucun
      // pont/tunnel alternatif gratuit) : un choix plus discutable que pour les cas précédents, assumé pour
      // rester cohérent avec la même règle "péage ponctuel à tarif fixe, jamais au kilomètre -> hors modèle"
      // appliquée partout ailleurs plutôt que d'inventer un nouveau mécanisme de péage au franchissement
      // juste pour ce pays (voir README, section "Pays couverts").
      DK: { code:'DK', name:'Danemark', file:'communes-dk.txt', hasToll:false, aliasFile:'aliases-dk.txt', currency:'DKK' },
      // Norvège : hasToll:false, cas le plus fragmenté de toute cette série — PAS deux ouvrages isolés
      // comme le Danemark, mais environ 190-200 postes de péage électronique (bomstasjoner, système
      // AutoPASS, statens vegvesen) répartis sur tout le pays et gérés par des dizaines de sociétés
      // régionales différentes (Fjellinjen à Oslo — 83 postes sur trois anneaux à eux seuls —, Ferde à
      // Bergen/côte ouest, Vegamot à Trondheim...). Système au passage (point-based), jamais un
      // barème €/km ni une vignette à prix fixe unique : aucun montant national représentatif n'en
      // dérive, contrairement à la France/l'Espagne/la Croatie (barème) ou la Suisse/l'Autriche
      // (vignette) — même conclusion que les ouvrages isolés (M50 irlandais, Kiltunnel néerlandais...)
      // mais pour une raison inverse : pas trop peu de données pour établir un tarif, mais bien trop de
      // systèmes disjoints pour qu'un seul soit représentatif. Ferries : contrairement au Danemark
      // (Bornholm), aucune nouvelle ligne modélisée pour la Norvège dans ce passage — son littoral
      // fjordé compte de très nombreuses traversées, mais ce sont pour la plupart des prolongements
      // fonctionnels du réseau routier national (ex. ferries de l'E39) plutôt que de vraies escapades
      // insulaires comparables à la Corse/aux Baléares/à Bornholm ; les rares vraies îles significatives
      // (Lofoten, Senja, Hitra/Frøya...) sont aujourd'hui reliées par pont ou tunnel. Limite assumée,
      // comme les Açores/Madère pour le Portugal ou les petites îles danoises non retenues.
      NO: { code:'NO', name:'Norvège', file:'communes-no.txt', hasToll:false, aliasFile:'aliases-no.txt', currency:'NOK' },
      // Suède : hasToll:false, cas le plus simple des trois pays nordiques ajoutés jusqu'ici — réseau
      // autoroutier réellement gratuit dans son ensemble (transportstyrelsen.se : "aucune vignette,
      // aucune barrière de péage sur route ouverte", l'un des réseaux les moins taxés d'Europe). Seuls
      // Stockholm et Göteborg appliquent une taxe d'encombrement urbain (trängselskatt, 6h-18h29 en
      // semaine, jusqu'à 135 SEK/jour) à l'entrée/sortie du centre-ville — pas un péage routier au sens
      // de cette app, même raisonnement que la redevance de congestion de La Valette (Malte, déjà non
      // modélisée) : ni l'un ni l'autre n'est un péage autoroutier proportionnel à la distance parcourue.
      SE: { code:'SE', name:'Suède', file:'communes-se.txt', hasToll:false, aliasFile:'aliases-se.txt', currency:'SEK' },
      // Finlande : hasToll:false — cas le plus simple de toute la série nordique, réseau autoroutier
      // entièrement gratuit, aucune vignette, aucun péage ponctuel, aucune taxe de congestion urbaine
      // contrairement à la Suède (travelinformation.eu/suomiguide.fi : "l'un des rares pays de l'UE
      // entièrement libre de péages routiers pour les véhicules privés"). En zone euro (comme
      // l'Irlande) : pas de champ `currency`.
      FI: { code:'FI', name:'Finlande', file:'communes-fi.txt', hasToll:false, aliasFile:'aliases-fi.txt' },
      // Îles Åland : code pays GeoNames DISTINCT de la Finlande (comme GG/JE/IM pour le Royaume-Uni) —
      // le fichier de codes postaux officiel finlandais ne couvre pas cet archipel autonome et
      // unilingue suédois, vérifié (voir commentaire de build-country-communes.js). hasToll:false comme
      // le reste de la Finlande ; en zone euro malgré l'autonomie fiscale/douanière de l'archipel (hors
      // TVA de l'UE mais PAS hors zone euro) — pas de champ `currency` non plus.
      AX: { code:'AX', name:'Îles Åland', file:'communes-ax.txt', hasToll:false, aliasFile:'aliases-ax.txt' },
      // Monténégro : hasToll:false. Un vrai péage existe pourtant — l'autoroute A1 Bar-Boljare (tronçon
      // achevé Smokovac-Mateševo, ~41 km, sur un projet bien plus long encore en construction) et le
      // tunnel de Sozina, tarifs par catégorie de véhicule (tolls.eu 2026) — mais un seul tronçon isolé
      // sur un réseau autoroutier encore embryonnaire, jamais garanti par un trajet aléatoire : même
      // raisonnement que les trois sections polonaises concédées ou le M50 irlandais, à l'échelle d'un
      // pays entier plutôt que de quelques kilomètres. En zone euro DE FAIT depuis 2002 (adoption
      // unilatérale, jamais membre de la BCE ni de l'UE) : pas de champ `currency`. Aucune île réelle à
      // gérer (Sveti Stefan est un îlot-presqu'île relié par une digue, pas un vrai détachement
      // insulaire) : aucune ligne FERRY_ROUTES ni cas landmassOf nécessaire.
      ME: { code:'ME', name:'Monténégro', file:'communes-me.txt', hasToll:false, aliasFile:'aliases-me.txt' },
      // Albanie : hasToll:false — des infrastructures de péage existent bien sur l'autoroute A1 (Milot-
      // Morinë et Thumanë-Kashar) mais la perception n'a, à ce jour (2026), jamais commencé (tolls.eu,
      // onyxtms.com) : concrètement gratuit pour l'instant, à réévaluer si la perception démarre
      // réellement. Devise : ALL (lek albanais, hors zone euro) — pays moins cher que la zone euro, même
      // profil que la République tchèque/la Pologne/la Hongrie/la Bosnie-Herzégovine.
      AL: { code:'AL', name:'Albanie', file:'communes-al.txt', hasToll:false, aliasFile:'aliases-al.txt', currency:'ALL' },
      // Kosovo : hasToll:false — sources contradictoires sur un éventuel péage aux points de passage des
      // autoroutes R6/R7, mais la majorité des sources récentes (fuel-prices.eu 2026, rks-gov.net) le
      // décrivent comme gratuit ; choix retenu par prudence plutôt que de modéliser un montant incertain.
      // Pays sans littoral : aucune ligne FERRY_ROUTES ni cas landmassOf nécessaire. En zone euro DE FAIT
      // depuis 2002 (adoption unilatérale, jamais membre de la BCE ni de l'UE, comme le Monténégro) :
      // pas de champ `currency`. Code pays GeoNames "XK" (identifiant provisoire largement utilisé par
      // l'UE/SWIFT/etc. en l'absence de code ISO 3166-1 officiel, le Kosovo n'étant pas membre de l'ONU).
      XK: { code:'XK', name:'Kosovo', file:'communes-xk.txt', hasToll:false, aliasFile:'aliases-xk.txt' },
      // Serbie : hasToll:true, contrairement aux trois pays précédents (Monténégro/Albanie/Kosovo,
      // tous hasToll:false) — un vrai réseau autoroutier à péage FERMÉ (ticket à l'entrée, paiement à
      // la sortie), géré par Putevi Srbije, 938 km au total, 77 gares de péage automatiques (voir
      // TOLL_RATE_BY_COUNTRY.RS plus bas pour le détail du calcul). Devise : RSD (dinar serbe), hors
      // zone euro — cours étroitement géré par la Banque nationale de Serbie autour de ~117,4 RSD
      // pour 1 EUR depuis des années (tolls.eu 2026, xe.com), sans être un régime de caisse
      // d'émission à parité FIXE légale comme le mark convertible bosnien.
      RS: { code:'RS', name:'Serbie', file:'communes-rs.txt', hasToll:true, aliasFile:'aliases-rs.txt', currency:'RSD' },
      // Macédoine du Nord : hasToll:true elle aussi — péage aux gares (paiement au passage plutôt
      // qu'un ticket entrée/sortie comme la Serbie/la Croatie, mais bien proportionnel au trajet
      // parcouru une fois les gares successives cumulées sur un même axe, voir TOLL_RATE_BY_COUNTRY.MK
      // plus bas), géré par l'Entreprise publique des routes d'État (roads.org.mk). Devise : MKD
      // (denar macédonien), hors zone euro mais ancré DE FACTO à l'euro par la Banque nationale
      // depuis 1997 (~61,5 MKD pour 1 EUR, cible officielle de politique de change — mappr.co,
      // fxrate.io 2026), un régime proche (sans en être formellement un) de la caisse d'émission
      // bosnienne.
      MK: { code:'MK', name:'Macédoine du Nord', file:'communes-mk.txt', hasToll:true, aliasFile:'aliases-mk.txt', currency:'MKD' },
      // Grèce : hasToll:true — péage classique avec barrière comme la France/la Croatie/la Serbie,
      // réseau bien plus étendu que tous les pays balkaniques précédents (voir TOLL_RATE_BY_COUNTRY.GR
      // plus bas pour le détail du calcul, dérivé de trois vraies liaisons). En zone euro (depuis
      // l'origine, 2001) : pas de champ `currency`.
      GR: { code:'GR', name:'Grèce', file:'communes-gr.txt', hasToll:true, aliasFile:'aliases-gr.txt' },
      // Bulgarie : hasToll:false — pas de péage au trajet mais une vignette électronique OBLIGATOIRE
      // (e-vignette BGTOLL, bgtoll.bg, société publique gestionnaire du réseau) plutôt qu'un barème
      // €/km, même famille que la Suisse/l'Autriche/la République tchèque/la Slovaquie/la Hongrie/la
      // Slovénie déjà couvertes (voir champ `vignette` juste dessous). En zone euro depuis le 1er
      // janvier 2026 (dernière entrée en date, remplaçant le lev bulgare/BGN à parité fixe historique
      // 1,95583 — europarl.europa.eu, consilium.europa.eu 2026) : pas de champ `currency` non plus,
      // contrairement à ce qu'aurait exigé ce même pays un an plus tôt.
      BG: { code:'BG', name:'Bulgarie', file:'communes-bg.txt', hasToll:false, aliasFile:'aliases-bg.txt',
        vignette:{ url:'https://www.bgtoll.bg' } },
      // Roumanie : même famille que la Bulgarie — hasToll:false, vignette électronique OBLIGATOIRE
      // (rovinieta, portail officiel CNAIR erovinieta.ro) plutôt qu'un péage au trajet. Devise : RON
      // (leu roumain), hors zone euro et flottant (contrairement au lev bulgare, jamais arrimé à
      // l'euro à taux fixe) — ~5,25 RON pour 1 EUR début septembre 2026 (xe.com/ecb.europa.eu).
      RO: { code:'RO', name:'Roumanie', file:'communes-ro.txt', hasToll:false, aliasFile:'aliases-ro.txt', currency:'RON',
        vignette:{ url:'https://www.erovinieta.ro' } },
      // Lettonie, Lituanie, Estonie : les trois pays baltes, ajoutés ensemble. `hasToll:false` pour
      // les trois, et surtout SANS la moindre vignette pour véhicule léger — contrairement à la
      // Bulgarie/la Roumanie juste au-dessus, les trois pays baltes ont un réseau autoroutier
      // ENTIÈREMENT gratuit pour les voitures/vans/motos (tolls.eu/fuel-prices.eu/vintrica.com 2026,
      // vérifié pour les trois) : seuls les poids lourds (>3-3,5 t selon le pays) ont besoin d'une
      // vignette électronique — hors du périmètre de cette app, qui ne modélise que des véhicules
      // légers. Même groupe que l'Allemagne/l'Andorre/le Luxembourg plus haut, pas celui de la
      // Suisse/l'Autriche/la Bulgarie/la Roumanie. Aucun champ `currency` non plus pour les trois :
      // en zone euro depuis 2011 (Estonie), 2014 (Lettonie) et 2015 (Lituanie) — un groupe de trois
      // adoptions consécutives et rapprochées dans le temps, la dernière (Lituanie, 2015) restant
      // tout de même antérieure à celle de la Croatie (2023), l'adoption la plus récente de tous les
      // pays ici couverts.
      LV: { code:'LV', name:'Lettonie', file:'communes-lv.txt', hasToll:false, aliasFile:'aliases-lv.txt' },
      LT: { code:'LT', name:'Lituanie', file:'communes-lt.txt', hasToll:false, aliasFile:'aliases-lt.txt' },
      EE: { code:'EE', name:'Estonie', file:'communes-ee.txt', hasToll:false, aliasFile:'aliases-ee.txt' },
      // Vatican : cas le plus simple de toute cette table — UNE SEULE commune au monde (le pays tient
      // entièrement dans son unique code postal, voir "Pays couverts"), `hasToll:false` sans la
      // moindre exception à modéliser (pas de réseau routier au sens propre), pas de champ `currency`
      // (accord monétaire avec l'UE, euro comme Saint-Marin/Monaco/le Liechtenstein déjà couverts).
      VA: { code:'VA', name:'Vatican', file:'communes-va.txt', hasToll:false, aliasFile:'aliases-va.txt' },
      // Islande : `hasToll:false` — PAS parce que le réseau est entièrement gratuit (deux vrais péages
      // existent bel et bien, voir TOLL_RATE_BY_COUNTRY plus bas) mais parce que ce sont des ouvrages
      // ISOLÉS (un tunnel, une section de route), jamais garantis par un trajet aléatoire — même
      // raisonnement déjà appliqué au Monténégro/à l'Albanie/aux trois sections polonaises concédées/
      // au M50 irlandais. Devise : ISK (couronne islandaise), hors zone euro ET hors UE (Islande membre
      // de l'AELE/EEE, pas de l'UE) — cours flottant, ~140,8 ISK pour 1 EUR début septembre 2026
      // (Banque centrale d'Islande, xe.com).
      IS: { code:'IS', name:'Islande', file:'communes-is.txt', hasToll:false, aliasFile:'aliases-is.txt', currency:'ISK' },
      // Îles Féroé : `hasToll:false` là aussi — mais pour une raison différente de l'Islande. Un vrai
      // réseau de péages existe (quatre tunnels sous-marins à péage fixe par passage : Eysturoyar-,
      // Sandoyar-, Norðoya- et Vágatunnilin — voir "Ferries" plus bas pour Sandoy, seule île encore
      // reliée par un vrai ferry), mais ce sont des tarifs FIXES par ouvrage, pas un barème €/km sur
      // une distance parcourue comme le reste de cette table — même limite déjà assumée pour les ponts
      // danois (Storebælt/Øresund, jamais modélisés) plutôt que d'inventer un taux artificiel. Devise :
      // DKK explicitement (la couronne féroïenne n'a pas de code ISO 4217 propre — parité fixe 1:1
      // avec la couronne danoise, billets danois ayant cours légal), pas de nouveau symbole nécessaire
      // (CURRENCY_SYMBOL.DKK déjà présent depuis le Danemark).
      FO: { code:'FO', name:'Îles Féroé', file:'communes-fo.txt', hasToll:false, aliasFile:'aliases-fo.txt', currency:'DKK' },
      // Gibraltar : cas le plus simple de tout l'ajout — `hasToll:false` sans la moindre exception à
      // modéliser, comme Monaco/Malte/Guernesey/Jersey (aucun réseau autoroutier à péage ni vignette,
      // 49,9 km de route au total, vérifié). Devise propre, GIP (livre de Gibraltar), à parité FIXE
      // 1:1 avec la livre sterling (billets/pièces britanniques ayant cours légal sur le territoire,
      // comme l'inverse n'est PAS vrai — les billets gibraltariens ne sont pas toujours acceptés au
      // Royaume-Uni) — un vrai code ISO 4217 propre malgré cette parité, contrairement à la couronne
      // féroïenne (FO ci-dessus, sans code ISO propre) : `currency:'GIP'` plutôt que de réutiliser
      // GBP tel quel.
      GI: { code:'GI', name:'Gibraltar', file:'communes-gi.txt', hasToll:false, aliasFile:'aliases-gi.txt', currency:'GIP' },
      // Moldavie : `hasToll:false` — pas de péage au trajet mais une vignette électronique
      // OBLIGATOIRE (e-vinieta, portail officiel gov.md) pour tout véhicule immatriculé à
      // l'étranger (les véhicules moldaves, eux, paient une taxe routière différente, hors du
      // périmètre de cette app qui modélise un trajet DEPUIS la France) — même famille que la
      // Bulgarie/la Roumanie/la République tchèque déjà couvertes, un visiteur français y aurait
      // bien besoin d'acheter cette vignette avant de circuler. Devise : MDL (leu moldave), hors
      // zone euro, flottant — 1 EUR ≈ 20,1 MDL début septembre 2026 (xe.com/wise.com).
      MD: { code:'MD', name:'Moldavie', file:'communes-md.txt', hasToll:false, aliasFile:'aliases-md.txt', currency:'MDL',
        vignette:{ url:'https://evinieta.gov.md' } },
      // Biélorussie : `hasToll:false` elle aussi — le système BelToll applique un vrai tarif au
      // kilomètre, mais UNIQUEMENT aux poids lourds ≥3,5 t (0,117-0,176 €/km selon le nombre
      // d'essieux) ; pour les véhicules légers couverts par cette app (voiture/van/moto), c'est une
      // vignette électronique à prix fixe par période (15 jours/30 jours/1 an, ev.beltoll.by) —
      // même famille que la Suisse/l'Autriche/la République tchèque/la Slovaquie/la Hongrie/la
      // Slovénie/la Bulgarie/la Roumanie/la Moldavie ci-dessus, pas celle de la France/l'Italie/la
      // Croatie (barème €/km réel pour les voitures). Devise : BYN (rouble biélorusse, redénominé
      // en 2016 après une forte inflation historique), hors zone euro, flottant — 1 EUR ≈ 3,4 BYN
      // début septembre 2026 (wise.com/coinbase.com).
      BY: { code:'BY', name:'Biélorussie', file:'communes-by.txt', hasToll:false, aliasFile:'aliases-by.txt', currency:'BYN',
        vignette:{ url:'https://ev.beltoll.by' } },
      // Ukraine : `hasToll:false` — AUCUN péage routier n'existe à ce jour (2026) dans le pays,
      // contrairement à la Biélorussie/la Moldavie voisines : le projet de système de péage national
      // est à l'étude depuis plus de 20 ans (coût estimé ~7 milliards UAH rien que pour
      // l'infrastructure de perception), et la première concession envisagée (Krakovets-Lviv, à la
      // frontière polonaise) reste à l'état de projet depuis plus de 30 ans — cas le plus simple de
      // tout cet ajout avec Gibraltar, aucune vignette non plus. Devise : UAH (hryvnia ukrainienne),
      // hors zone euro, régime de change géré (pas librement flottant, la Banque nationale
      // d'Ukraine intervenant activement depuis le début de la guerre) — 1 EUR ≈ 51,9 UAH début
      // septembre 2026 (xe.com/investing.com). Kherson/Saky/Alushta (Crimée) restent rattachées au
      // territoire ukrainien par cette app, comme le fait GeoNames lui-même (voir
      // build-country-communes.js) — aucune règle de péage ou de devise distincte n'est nécessaire
      // pour ces communes, la Crimée n'ayant jamais eu son propre régime douanier ou monétaire au
      // sein de l'Ukraine avant 2014.
      UA: { code:'UA', name:'Ukraine', file:'communes-ua.txt', hasToll:false, aliasFile:'aliases-ua.txt', currency:'UAH' },
      // Turquie, dernier ajout en date : `hasToll:true` — contrairement à Gibraltar/l'Ukraine
      // (aucun péage réel), un vrai réseau d'autoroutes (otoyol) à péage électronique proportionnel
      // à la distance (HGS, paiement automatique par plaque), rejoignant le groupe France/Espagne/
      // Italie/Croatie/Bosnie-Herzégovine/Serbie/Macédoine du Nord/Grèce plutôt que celui des pays à
      // vignette (voir TOLL_RATE_BY_COUNTRY.TR plus bas pour le détail du calcul). Devise : TRY (livre
      // turque), hors zone euro, flottante — 1 EUR ≈ 56,3 TRY début septembre 2026 (xe.com/ecb.europa.eu).
      TR: { code:'TR', name:'Turquie', file:'communes-tr.txt', hasToll:true, aliasFile:'aliases-tr.txt', currency:'TRY' },
      // Géorgie, dernier ajout en date : `hasToll:false` — comme l'Ukraine/Gibraltar, aucun péage
      // routier n'existe à ce jour (2026) pour les véhicules particuliers ; la seule route à péage du
      // pays (rocade de contournement de Tbilissi, TBTR) est encore en construction et vise le fret de
      // transit, pas les particuliers, et la Direction des routes a explicitement écarté toute
      // extension aux grands axes nationaux (georgiatoday.ge, juin 2026) — aucune vignette non plus.
      // Devise : GEL (lari géorgien), hors zone euro, flottante — 1 EUR ≈ 3,04 GEL début septembre
      // 2026 (xe.com/valutafx.com).
      GE: { code:'GE', name:'Géorgie', file:'communes-ge.txt', hasToll:false, aliasFile:'aliases-ge.txt', currency:'GEL' },
      // Arménie, dernier ajout en date : `hasToll:false` — aucun péage routier réel aujourd'hui (le
      // seul dispositif ayant existé, un droit d'usage pour les véhicules immatriculés à l'étranger,
      // a été aboli en 2018 ; le corridor Nord-Sud en construction n'a, à ce jour, aucun péage confirmé
      // par son propre maître d'ouvrage — armroad.am — malgré des annonces non officielles), aucune
      // vignette non plus. Devise : AMD (dram arménien), hors zone euro, flottante — 1 EUR ≈ 420 AMD
      // début septembre 2026 (xe.com). Pas de fichier alias : aucun rapprochement altnames/AM.txt
      // fiable construit pour cet ajout (voir build-am-communes.js, reconstruction par nom depuis la
      // poste arménienne plutôt que par geonameid), comme pour la France ou le ladin ailleurs dans ce
      // projet. GEONAMES N'A AUCUN CODE POSTAL POUR CE PAYS (export/zip/AM.zip -> 404, vérifié, comme
      // la Géorgie/le Monténégro/le Kosovo) : reconstruit à la place depuis la liste officielle des
      // 775 bureaux de poste d'Haypost (la poste nationale arménienne elle-même — une source PLUS
      // directe que yell.ge pour la Géorgie), rapproché par nom (voir build-am-communes.js) — 458
      // communes retenues.
      AM: { code:'AM', name:'Arménie', file:'communes-am.txt', hasToll:false, currency:'AMD' },
      // Azerbaïdjan, dernier ajout en date : `hasToll:true` — un vrai péage proportionnel à la
      // distance existe (route M-1 Bakou-Quba, 129 km, ouverte le 20/10/2023, gérée par l'AAYDA/
      // Agence d'Etat des routes, barème officiel aayda.gov.az/uploads/1698392863.pdf), rejoignant le
      // groupe France/Espagne/Italie/Turquie plutôt que celui des pays à vignette — voir
      // TOLL_RATE_BY_COUNTRY.AZ plus bas pour le détail du calcul. Devise : AZN (manat azerbaïdjanais),
      // hors zone euro, quasi-arrimée au dollar — 1 EUR ≈ 1,85 AZN début septembre 2026 (xe.com).
      // LIMITE IMPORTANTE À CONNAÎTRE, documentée ici par transparence plutôt que dissimulée : les
      // frontières terrestres de l'Azerbaïdjan sont fermées à l'entrée des voyageurs depuis mars 2020
      // (régime de quarantaine spéciale instauré pour le covid, prolongé sans interruption depuis —
      // dernière prolongation connue jusqu'au 1er octobre 2026, motif désormais sécuritaire selon le
      // président Aliyev lui-même, septembre 2024 ; sources concordantes : oc-media.org, gov.uk/
      // foreign-travel-advice/azerbaijan, thegeorgianguide.com). Un road trip en voiture ENTRANT en
      // Azerbaïdjan depuis la Géorgie n'est donc pas physiquement réalisable pour un touriste à ce
      // jour — seule la sortie du pays par voie terrestre est tolérée. Pays ajouté malgré cette
      // limite (choix explicite de l'utilisateur, comme la Bosnie-Herzégovine a été ajoutée malgré des
      // codes postaux incomplets) : la situation est documentée comme actuelle et susceptible
      // d'évoluer, pas comme une garantie de faisabilité du trajet généré.
      AZ: { code:'AZ', name:'Azerbaïdjan', file:'communes-az.txt', hasToll:true, aliasFile:'aliases-az.txt', currency:'AZN' },
      // Syrie, dernier ajout en date : `hasToll:false` — aucun péage routier en vigueur à ce jour
      // (2026) ; le gouvernement post-2024 étudie deux corridors à péage sous concession privée (BOT),
      // mais rien n'est construit ni opérationnel (Enab Baladi, 3 juillet 2026, citant le directeur
      // général de l'Établissement général des routes). Devise : SYP (nouvelle livre syrienne,
      // introduite le 1er/3 janvier 2026, 100 anciennes livres = 1 nouvelle — décret n°293, remplacement
      // quasi achevé mi-2026). GEONAMES N'A AUCUN CODE POSTAL POUR CE PAYS, et — À LA DIFFÉRENCE de
      // l'Arménie/la Géorgie/le Monténégro/le Kosovo ci-dessus — la Syrie n'a tout simplement AUCUN
      // système de codes postaux en usage réel (courrier distribué par gouvernorat/district/
      // sous-district/localité, sans code numérique standard ; aucune source tierce fiable identifiée,
      // les agrégateurs commerciaux consultés n'étant pas garantis non inventés). PREMIER CAS DE CE
      // GENRE DANS CE PROJET : le champ "cp" utilise ici le code de GOUVERNORAT ISO 3166-2:SY (14
      // gouvernorats, ex. "SY-DI" Damas) plutôt qu'un vrai code postal — désambiguïsation nettement
      // plus grossière, choix explicite de l'utilisateur (voir build-sy-communes.js et README, "Pays
      // couverts"). Couverture volontairement limitée aux localités d'au moins 1 000 habitants (126
      // communes) : le champ population du dump GeoNames syrien est très lacunaire (guerre civile),
      // une couverture exhaustive aurait noyé les vraies villes sous des milliers de hameaux à
      // population inconnue de toute façon peu discernables sous un même code de gouvernorat. Pas de
      // fichier alias (comme l'Arménie ci-dessus). Aucun ferry pour véhicule de tourisme identifié
      // (voir FERRY_ROUTES plus bas) : la ligne Mersin-Lattaquié est un cargo Ro-Ro pour remorques
      // (65 places, 12 passagers seulement), pas un ferry touristique.
      SY: { code:'SY', name:'Syrie', file:'communes-sy.txt', hasToll:false, currency:'SYP' },
      // Chypre, dernier ajout en date : `hasToll:false` — aucun péage routier ni vignette (réseau
      // autoroutier A1/A2/A3/A5/A6/A7/A9 entièrement gratuit). Devise : euro (zone euro depuis 2008),
      // aucun champ `currency` nécessaire. Le grec et le turc, ses deux langues officielles, sont déjà
      // couverts par ce projet depuis respectivement la Grèce et la Turquie — aucune langue nouvelle
      // ajoutée pour ce pays (le grec/turc chypriotes restent des variétés essentiellement ORALES,
      // sans norme écrite distincte utilisée à l'officiel/au numérique — voir README, "Langues").
      // GeoNames traite l'île entière (nord compris) sous un même code pays CY, y compris pour les
      // codes postaux (mêmes coordonnées exactes entre le dump et le fichier de codes postaux pour
      // Kyrénia/Famagouste/Morphou) — repris tel quel, sans exclusion ni retouche éditoriale politique
      // (même principe déjà appliqué au Kosovo/à la Crimée/à la Transnistrie/à l'Abkhazie ailleurs
      // dans ce projet). Deux corrections `NAME_OVERRIDES` seulement, limitées aux villes SANS
      // ambiguïté de contrôle territorial (zone sous administration de la République de Chypre) :
      // Limassol -> Lemesos, Larnaca -> Larnaka, Paphos -> Pafos (déjà la forme utilisée par le champ
      // région GeoNames de chaque ligne) — Nicosie/Kyrénia/Famagouste ne sont PAS corrigées (Nicosie
      // reste le nom utilisé jusque dans les communications officielles anglophones de la République
      // de Chypre elle-même ; Kyrénia/Famagouste sont administrées de facto par la partie chypriote
      // turque, non reconnue internationalement — y substituer la forme grecque trancherait
      // éditorialement une question politique disputée).
      CY: { code:'CY', name:'Chypre', file:'communes-cy.txt', hasToll:false, aliasFile:'aliases-cy.txt' },
      // Liban, Israël, Palestine, Jordanie, Égypte et Libye, dernier ajout en date (les six en une
      // seule fois, choix explicite de l'utilisateur). AUCUN des six n'a de fichier de codes postaux
      // GeoNames (export/zip/{LB,IL,PS,JO,EG,LY}.zip -> 404, vérifié pour chacun) — contrairement à la
      // Syrie cependant, la plupart ont un VRAI système de codes postaux, simplement sans source
      // ouverte exploitable commune par commune (voir build-govfallback-communes.js pour le détail
      // complet par pays). Le champ "cp" utilise donc, comme pour la Syrie, un code de
      // gouvernorat/district ISO 3166-2 (ou une étiquette informelle documentée comme telle quand
      // aucun code ISO officiel ne correspond au découpage que distingue GeoNames — Cisjordanie/Gaza
      // côté Palestine, "Judea and Samaria Area" côté Israël).
      // **Liban** : `hasToll:false` — aucun péage n'a jamais existé, aucun projet identifié non plus
      // (contrairement à la Syrie, où des corridors à péage sont au moins à l'étude). Devise `LBP`
      // (livre libanaise) — dollarisation de facto de l'économie largement documentée depuis la crise
      // de 2019-2020, mais LBP reste la devise légale ; taux stabilisé ~89 500 LBP/USD début 2026
      // (Sayrafa/officiel unifiés fin 2023), soit ~96 500 LBP/EUR — `CURRENCY_GLYPH` utilise
      // l'abréviation locale "LL" plutôt qu'un symbole dédié (aucun n'existe). 41 communes retenues
      // (population ≥500, champ population très lacunaire dans le dump libanais).
      LB: { code:'LB', name:'Liban', file:'communes-lb.txt', hasToll:false, aliasFile:'aliases-lb.txt', currency:'LBP' },
      // **Israël** : `hasToll:true` — deux vrais ouvrages à péage réels (route 6/Kvish Sderot Yisrael,
      // système "free-flow" sans barrière géré par Derech Eretz Highways ; tunnels du Carmel à Haïfa,
      // gérés par Carmelton), mais tarifés AU TRONÇON plutôt qu'au kilomètre — voir
      // TOLL_RATE_BY_COUNTRY.IL plus bas pour la conversion approximative retenue. Devise `ILS`
      // (nouveau shekel israélien) — symbole "₪" (U+20AA, normalisé Unicode dès 1993, aussi ancien que
      // le symbole dollar, mais peu gravé sur les claviers vendus localement où l'abréviation "ש״ח"
      // reste courante à l'écrit manuscrit — le glyphe Unicode lui-même s'affiche sans risque partout
      // ailleurs). Codes postaux réels à 7 chiffres mais calés au niveau de la RUE, pas de la commune
      // (structure inédite parmi tous les pays de ce projet) — la seule source tierce exploitable
      // identifiée (odata.org.il, extraction ~09/2020) est protégée par un CAPTCHA Cloudflare, jamais
      // contourné par principe : repli sur le district (6 districts + "Judea and Samaria Area", 4
      // lieux seulement dans le dump israélien lui-même sous ce dernier libellé, repris tel quel sans
      // retouche éditoriale — même principe que pour le nord de Chypre/le Kosovo/la Crimée ailleurs
      // dans ce projet). 407 communes retenues (population ≥1000).
      IL: { code:'IL', name:'Israël', file:'communes-il.txt', hasToll:true, aliasFile:'aliases-il.txt', currency:'ILS' },
      // **Palestine** (code GeoNames "PS", Cisjordanie + bande de Gaza) : `hasToll:false`, aucun péage
      // identifié. Aucun champ `currency` propre : le Protocole de Paris de 1994 n'a désigné aucune
      // monnaie unique, mais le nouveau shekel israélien (ILS, déjà couvert par l'ajout d'Israël
      // ci-dessus) domine largement les transactions quotidiennes — même logique que Chypre/l'euro
      // plus haut, pas de nouveau champ pour un usage minoritaire (JOD/USD, réservés à des usages
      // bancaires/municipaux spécifiques plutôt qu'au tourisme courant). Codes lancés par l'Autorité
      // palestinienne en 2021, qualifiés "plus symboliques que pratiques" par un employé postal cité
      // dans la presse — aucune liste exploitable, repli sur "PS-WBK"/"PS-GZA" (étiquettes informelles,
      // GeoNames ne distinguant que ces deux zones dans son propre champ admin1 — le vrai découpage
      // ISO 3166-2:PS, 16 gouvernorats, est plus fin que ce que GeoNames permet de reconstruire ici).
      // SITUATION ACTUELLE DOCUMENTÉE PAR TRANSPARENCE (choix explicite de l'utilisateur d'inclure les
      // deux zones malgré cela) : Gaza traverse une catastrophe humanitaire active malgré le
      // cessez-le-feu du 10 octobre 2025 (plus de 1300 morts rapportés depuis cette date jusqu'à
      // début septembre 2026, infrastructures d'eau/d'assainissement très largement hors service,
      // Etats-Unis niveau 4 "Do Not Travel") ; la Cisjordanie connaît elle aussi une situation
      // sécuritaire grave et distincte (82 Palestiniens tués janvier-août 2026, zones d'interdiction
      // de déplacement ponctuelles selon le FCDO britannique, niveau 3 "Reconsider Travel" côté
      // américain) — sources : OCHA oPt, France Diplomatie, gov.uk, travel.state.gov, toutes datées de
      // 2026. 337 communes retenues (population ≥1000).
      PS: { code:'PS', name:'Palestine', file:'communes-ps.txt', hasToll:false, aliasFile:'aliases-ps.txt', currency:'ILS' },
      // **Jordanie** : `hasToll:false` — un projet de péage (0,011 JD/km voiture) est à l'étude dans le
      // cadre de la "Economic Modernization Vision", mais au stade consultance, rien de construit.
      // Devise `JOD` (dinar jordanien) — arrimé au dollar depuis 1995 (peg fixe ≈0,709 JOD/USD),
      // devise "forte" contrairement à la plupart des autres devises de cette table (1 JOD ≈ 1,22 EUR
      // mi-septembre 2026) ; `CURRENCY_GLYPH` utilise l'abréviation locale "JD" (aucun symbole dédié).
      // 90 communes retenues (population ≥1000). Aucun ferry ajouté malgré une vraie ligne Aqaba-Nuweiba
      // vers l'Égypte (voir COUNTRIES.EG ci-dessous pour le détail de ce choix).
      JO: { code:'JO', name:'Jordanie', file:'communes-jo.txt', hasToll:false, aliasFile:'aliases-jo.txt', currency:'JOD' },
      // **Égypte** : `hasToll:false` — un vrai réseau de péages existe (Le Caire-Alexandrie désert,
      // route de la mer Rouge, tunnels d'Ismaïlia/Port-Saïd...) mais à tarif FIXE par poste
      // ("بوابة رسوم"), sans barème origine-destination cohérent — même traitement que le pont du
      // Storebælt danois/le M50 irlandais déjà écartés du modèle ailleurs dans ce projet. Devise `EGP`
      // (livre égyptienne), plusieurs dévaluations majeures depuis 2016 puis 2022-2024 — 1 EUR ≈ 59,5
      // EGP mi-septembre 2026 ; `CURRENCY_GLYPH` utilise l'abréviation locale "LE" (aucun symbole
      // dédié, comme la livre syrienne/libanaise). 251 communes retenues (population ≥1000, champ
      // population très lacunaire dans le dump égyptien malgré ~100 millions d'habitants — seules 251
      // entrées sur 11 646 lieux retenus par ailleurs ont une population enregistrée).
      // **Ferry Aqaba (Jordanie) – Nuweiba (Égypte)** : une vraie ligne pour véhicules existe (Arab
      // Bridge Maritime, ~2-3h, tarifs officiels ~250 $ voiture/100 $ moto) — DÉLIBÉRÉMENT PAS ajoutée
      // à FERRY_ROUTES malgré cette réalité : la Jordanie et l'Égypte partagent déjà, via Israël (les
      // trois pays "continental" au sens de `landmassOf`), un vrai itinéraire terrestre alternatif
      // (postes-frontières Eilat-Aqaba et Taba), contrairement à Malte ou aux îles grecques qui, elles,
      // N'ONT AUCUNE alternative terrestre et ont donc besoin d'un vrai ferry pour être atteignables.
      // Donner à la Jordanie et à l'Égypte leur propre "landmass" rien que pour activer cette ligne
      // casserait la connectivité terrestre réelle déjà correcte entre les trois pays (exactement le
      // genre de bug déjà rencontré et corrigé pour Chypre lors de l'ajout précédent) — un vrai ferry
      // documenté ici plutôt que silencieusement omis, mais non modélisé pour cette raison
      // architecturale précise.
      EG: { code:'EG', name:'Égypte', file:'communes-eg.txt', hasToll:false, aliasFile:'aliases-eg.txt', currency:'EGP' },
      // **Libye** : `hasToll:false` — aucun péage identifié (absence de preuve plutôt que preuve
      // d'absence explicite, à la différence de la Syrie où une source affirme noir sur blanc
      // l'absence de péage — nuance documentée ici par honnêteté). Devise `LYD` (dinar libyen), double
      // taux marqué : officiel ≈6,30 LYD/USD (dévaluation du 18 janvier 2026), marché parallèle
      // ≈10 LYD/USD (écart &gt;50%, cbl.gov.ly/WFP VAM) — soit très approximativement 6,8-10,8 LYD/EUR
      // selon le taux retenu ; `CURRENCY_GLYPH` utilise l'abréviation locale "ل.د" (aucun symbole
      // dédié). Aucun ferry pour véhicule de tourisme identifié (dernière ligne Malte-Tripoli connue :
      // années 1990, jamais rétablie). 119 communes retenues (population ≥1000).
      // LIMITE IMPORTANTE DOCUMENTÉE PAR TRANSPARENCE (choix explicite de l'utilisateur d'ajouter le
      // pays malgré cela, comme pour l'Azerbaïdjan plus haut) : la quasi-totalité du territoire est
      // sous le niveau de déconseil le plus élevé des autorités occidentales au moment de cet ajout —
      // Etats-Unis niveau 4 "Do Not Travel" (mise à jour du 31 août 2026 ; mines et engins non
      // explosés non signalés de façon fiable sur l'ensemble du territoire, risque de combats entre
      // groupes armés "à tout moment", recommandation officielle de laisser un testament et un
      // échantillon ADN avant le voyage), France Diplomatie déconseille formellement tout le pays sauf
      // Misrata/Benghazi (déconseillées "sauf raison impérative"). Pays toujours divisé de facto entre
      // deux autorités rivales (Government of National Unity à Tripoli, autorité de l'Est sous
      // contrôle Haftar/LNA à l'Est) sans réunification effective à ce jour.
      LY: { code:'LY', name:'Libye', file:'communes-ly.txt', hasToll:false, aliasFile:'aliases-ly.txt', currency:'LYD' },
      // ── LOT MAGHREB : Maroc, Algérie, Tunisie, Sahara occidental ────────────────────────────
      // **Le Maroc** : `hasToll:true`, un vrai péage proportionnel à la distance exploité par ADM
      // (Société Nationale des Autoroutes du Maroc, concessionnaire de l'État depuis 1989, ~1 800 km
      // de réseau) — voir TOLL_RATE_BY_COUNTRY plus bas pour le barème et sa dérivation. ADM ne
      // publie que TROIS classes (1 : deux essieux ≤1,30 m de haut ; 2 : deux essieux >1,30 m ou
      // plus de deux essieux <1,30 m ; 3 : plus de deux essieux >1,30 m) et AUCUNE classe moto —
      // une motocyclette relève donc de la classe 1 par la définition même d'ADM (deux essieux,
      // moins de 1,30 m), ce qui est une lecture du barème et non un tarif inventé. Devise `MAD`
      // (dirham marocain, 2 décimales) ; aucun symbole Unicode dédié n'existe, `CURRENCY_GLYPH`
      // utilise l'abréviation arabe usuelle "د.م.". 46 020 communes retenues — de loin le plus gros
      // fichier du lot. ATTENTION, limite documentée : le champ "cp" n'est PAS un code postal mais
      // le code de RÉGION ISO 3166-2:MA, le fichier de codes postaux GeoNames marocain étant
      // inutilisable (voir scripts/build-maghreb-communes.js pour la démonstration chiffrée).
      MA: { code:'MA', name:'Maroc', file:'communes-ma.txt', hasToll:true, aliasFile:'aliases-ma.txt', currency:'MAD' },
      // **L'Algérie** : `hasToll:false`. L'autoroute Est-Ouest (1 216 km, de la frontière tunisienne
      // à la frontière marocaine) et l'ensemble du réseau sont GRATUITS. 48 postes de péage ont bien
      // été construits physiquement vers 2010 mais n'ont jamais été mis en service, et la mise en
      // péage a été explicitement écartée par le président Tebboune en février 2026 ("il n'y aura pas
      // de points de péage sur l'autoroute") : traité comme un projet abandonné, pas comme un péage
      // à venir. Exploitant : Algérienne des Autoroutes (ADA), qui ne publie aucune grille. Devise
      // `DZD` (dinar algérien, 2 décimales et non 3 — les centimes sont de fait sortis de l'usage) ;
      // aucun symbole Unicode dédié, abréviation arabe "د.ج". 7 784 communes avec de VRAIS codes
      // postaux, seul territoire du lot dans ce cas.
      // RÉSERVE IMPORTANTE SUR LE COÛT AFFICHÉ : l'Algérie a deux taux de change dans les faits. Le
      // taux officiel de la Banque d'Algérie (~154 DZD pour 1 EUR le 15/09/2026) est celui utilisé
      // ici, faute de source officielle possible pour l'autre ; le marché parallèle s'échangeait
      // autour de 276 DZD pour 1 EUR début septembre 2026, soit ~80 % d'écart. Un budget de voyage
      // converti en euros au taux officiel est donc SURESTIMÉ dans cette proportion.
      DZ: { code:'DZ', name:'Algérie', file:'communes-dz.txt', hasToll:false, aliasFile:'aliases-dz.txt', currency:'DZD' },
      // **La Tunisie** : `hasToll:true`, péage réel exploité par la Société Tunisie Autoroutes (STA,
      // capital détenu à 99,08 % par l'État), concessionnaire des A1/A3/A4, barème révisé par décret
      // du 15 juillet 2025. Trois classes également (1 : véhicules légers ; 2 : utilitaires et
      // camping-cars ; 3 : poids lourds et cars à deux essieux), aucune classe moto : même lecture
      // que pour le Maroc, la moto relève de la classe 1 "véhicules légers". Devise `TND` (dinar
      // tunisien, **3 décimales** — le millime vaut 1/1000 de dinar, et le calculateur officiel de
      // la STA affiche bien "3.900 TND") ; aucun symbole Unicode dédié, abréviation arabe "د.ت".
      // 1 615 communes avec de vrais codes postaux à 4 chiffres, mais issus d'un jeu TIERS SANS
      // LICENCE faute de source officielle accessible — voir scripts/build-maghreb-communes.js, même
      // réserve explicite que pour la Géorgie (yell.ge) et le Monténégro.
      TN: { code:'TN', name:'Tunisie', file:'communes-tn.txt', hasToll:true, aliasFile:'aliases-tn.txt', currency:'TND' },
      // **Le Sahara occidental** : territoire non autonome selon l'ONU, repris TEL QUEL depuis
      // GeoNames qui lui attribue un code pays "EH" distinct — même principe de non-retouche que
      // pour le nord de Chypre, le Kosovo et la Crimée ailleurs dans ce projet, et qui ne constitue
      // une prise de position d'aucune sorte. `hasToll:false` : la voie express Tiznit-Dakhla
      // (1 055 km, RN1 dédoublée, rebaptisée en août 2026) relève du ministère de l'Équipement et
      // non d'ADM, et ne comporte aucun poste de péage ; le réseau concédé ADM s'arrête à Agadir.
      // Devise `MAD`, la monnaie réellement en circulation et celle qu'ISO 4217 rattache au
      // territoire (la peseta sahraouie de la RASD est commémorative, sans circulation commerciale).
      // AUCUN ferry pour véhicule n'existe vers Dakhla, Laâyoune ou Tarfaya, depuis nulle part : la
      // seule ligne ayant existé, Tarfaya-Fuerteventura, a fonctionné cinq mois en 2007-2008 avant
      // le naufrage de l'Assalama et n'a jamais rouvert (réouverture encore bloquée en mai 2025,
      // faute de poste d'inspection frontalier). 49 communes, champ "cp" = étiquette informelle "EH"
      // faute de toute subdivision exploitable (voir scripts/build-maghreb-communes.js).
      EH: { code:'EH', name:'Sahara occidental', file:'communes-eh.txt', hasToll:false, aliasFile:'aliases-eh.txt', currency:'MAD' },
      // ── LOT AFRIQUE DE L'OUEST : treize pays ────────────────────────────────────────────────
      // AUCUN des treize n'a de fichier de codes postaux GeoNames (404 vérifié un par un) : le champ
      // "cp" porte partout une étiquette de région "XX-<code admin1 GeoNames>", informelle et
      // documentée comme telle — voir scripts/build-westafrica-communes.js.
      // PÉAGES : seul le Sénégal a un système FERMÉ, donc réellement proportionnel à la distance, et
      // c'est le seul à recevoir un barème au kilomètre. Partout ailleurs le péage existe bel et bien
      // mais il est FORFAITAIRE PAR BARRIÈRE (500 FCFA au Togo, 200 au Burkina, 500 au Mali, 1 000 sur
      // l'Autoroute du Nord ivoirienne, 20 000 GNF au pont guinéen de Tanéné, NLe 10 en Sierra
      // Leone) : le convertir en €/km supposerait de connaître l'espacement réel des postes, que
      // personne ne publie. `hasToll:false` avec la raison écrite est préféré à un chiffre dérivé
      // d'une hypothèse — le coût réel est donc sous-estimé pour ces pays, et c'est assumé.
      // BUDGET : sauf pour le Cap-Vert, aucune statistique publique de prix hôtelier n'existe (voir
      // BUDGET_PRICE_MAX plus bas pour le détail pays par pays).
      MR: { code:'MR', name:'Mauritanie', file:'communes-mr.txt', hasToll:false, aliasFile:'aliases-mr.txt', currency:'MRU' },
      // **Le Mali** : `hasToll:false` malgré des postes de péage réels (arrêté interministériel du
      // 7 mai 2021, 250 FCFA par essieu et par passage, soit 500 FCFA pour une voiture) — forfait par
      // passage, non kilométrique.
      // LIMITE MAJEURE DOCUMENTÉE : au 15 septembre 2026, France Diplomatie classe **l'ensemble du
      // territoire en zone rouge** et précise que « les attaques fréquentes sur les axes routiers
      // interdisent toute circulation par la route en dehors de Bamako ». S'y ajoutent un blocus du
      // carburant sur les axes vers Dakar, Abidjan et Conakry depuis septembre 2025, et un siège de
      // Bamako annoncé fin avril 2026 visant toutes les marchandises. Pays ajouté malgré cela, comme
      // la Libye et l'Azerbaïdjan avant lui, à surveiller plutôt qu'à considérer comme praticable.
      ML: { code:'ML', name:'Mali', file:'communes-ml.txt', hasToll:false, aliasFile:'aliases-ml.txt', currency:'XOF' },
      // **Le Sénégal** : `hasToll:true`, SEUL pays du lot dont le péage se rapporte honnêtement à une
      // distance — voir TOLL_RATE_BY_COUNTRY pour la dérivation.
      SN: { code:'SN', name:'Sénégal', file:'communes-sn.txt', hasToll:true, aliasFile:'aliases-sn.txt', currency:'XOF' },
      // **La Gambie** : `hasToll:false`. Le pont de la Senegambia (Farafenni, ouvert le 21 janvier
      // 2019) est bien à péage, mais aucun tarif officiel n'est publié — la page du ministère des
      // Transports renvoie une erreur 404 et les montants qui circulent viennent de sources
      // collaboratives. À noter, ce pont a rendu FACULTATIF le bac de Banjul-Barra : la route
      // Dakar-Ziguinchor par la Transgambienne est désormais continue.
      GM: { code:'GM', name:'Gambie', file:'communes-gm.txt', hasToll:false, aliasFile:'aliases-gm.txt', currency:'GMD' },
      // **Le Cap-Vert** : seul État insulaire du lot, et premier du projet dont TOUT le territoire est
      // morcelé — neuf îles habitées, chacune sa masse terrestre (voir landmassOf dans
      // lib/trip-engine.js) reliées par huit liaisons de FERRY_ROUTES. Aucun péage routier trouvé.
      // Devise `CVE`, à parité FIXE avec l'euro (110,265) depuis l'accord de coopération de change
      // avec le Portugal de 1998, transposé à l'euro par la décision du Conseil 98/744/CE.
      // Particularité de formatage : le symbole de l'escudo, le cifrão, s'écrit en SÉPARATEUR
      // DÉCIMAL (« 2$50 » = 2 escudos 50) et n'a aucun point de code Unicode propre. Le projet
      // affiche donc le code ISO plutôt qu'un symbole ambigu.
      CV: { code:'CV', name:'Cap-Vert', file:'communes-cv.txt', hasToll:false, aliasFile:'aliases-cv.txt', currency:'CVE' },
      // **La Guinée** : `hasToll:false`. Un seul ouvrage à péage en service, le pont de Tanéné
      // (inauguré le 27 avril 2025, 20 000 GNF pour une voiture), forfaitaire. Devise `GNF`, à
      // **zéro décimale** selon l'ISO 4217.
      GN: { code:'GN', name:'Guinée', file:'communes-gn.txt', hasToll:false, aliasFile:'aliases-gn.txt', currency:'GNF' },
      GW: { code:'GW', name:'Guinée-Bissau', file:'communes-gw.txt', hasToll:false, aliasFile:'aliases-gw.txt', currency:'XOF' },
      // **La Sierra Leone** : `hasToll:false` malgré la vraie autoroute à péage Wellington-Masiaka
      // (62 km, trois postes, concession China Railway Seventh Group) — le tarif y est forfaitaire par
      // poste (NLe 10 pour un SUV/pick-up depuis le 15 mai 2024). Devise `SLE`, le leone redénominé :
      // le code SLL a été retiré de l'ISO en décembre 2023 et l'ancien leone a cessé d'avoir cours
      // légal le 1er avril 2023, au taux de 1 000 anciens pour 1 nouveau.
      SL: { code:'SL', name:'Sierra Leone', file:'communes-sl.txt', hasToll:false, aliasFile:'aliases-sl.txt', currency:'SLE' },
      LR: { code:'LR', name:'Liberia', file:'communes-lr.txt', hasToll:false, aliasFile:'aliases-lr.txt', currency:'LRD' },
      // **Le Burkina Faso** : `hasToll:false` (péage réel mais forfaitaire, 200 FCFA par passage
      // depuis le 24 juillet 2025, Fonds spécial routier du Burkina).
      // LIMITE MAJEURE DOCUMENTÉE, comme pour le Mali : France Diplomatie déconseille formellement
      // tout déplacement dans le pays (mise à jour du 10 septembre 2026), l'ambassade de France à
      // Ouagadougou est fermée après la rupture des relations diplomatiques, et le Royaume-Uni
      // déconseille également tout voyage.
      BF: { code:'BF', name:'Burkina Faso', file:'communes-bf.txt', hasToll:false, aliasFile:'aliases-bf.txt', currency:'XOF' },
      // **La Côte d'Ivoire** : `hasToll:false` alors que le pays a de nombreux ouvrages à péage réels
      // (pont Henri Konan Bédié 500 FCFA, Attinguié et Singrobo 1 000 FCFA depuis le 10 février 2025,
      // quatre postes ouverts en février 2025 à 500 FCFA) — tous forfaitaires par barrière, aucun
      // système fermé, donc aucune distance à laquelle les rapporter.
      CI: { code:'CI', name:"Côte d'Ivoire", file:'communes-ci.txt', hasToll:false, aliasFile:'aliases-ci.txt', currency:'XOF' },
      // **Le Ghana** : `hasToll:false`, et ici c'est la situation réelle et non un repli — les péages
      // ont été SUPPRIMÉS le 18 novembre 2021 (budget 2022). Le Parlement a approuvé le 31 juillet
      // 2026 une concession de vingt ans avec Rock Africa Limited pour un système électronique sans
      // barrière sur 66 routes et ponts, visé au quatrième trimestre 2026, mais aucun tarif n'est
      // publié à ce jour. Devise `GHS`, seule du lot à avoir un vrai symbole Unicode : ₵ (U+20B5).
      GH: { code:'GH', name:'Ghana', file:'communes-gh.txt', hasToll:false, aliasFile:'aliases-gh.txt', currency:'GHS' },
      TG: { code:'TG', name:'Togo', file:'communes-tg.txt', hasToll:false, aliasFile:'aliases-tg.txt', currency:'XOF' },
      // ── LOT SAHEL, AFRIQUE CENTRALE ET CORNE DE L'AFRIQUE : onze pays ────────────────────────
      // Mêmes règles que le lot ouest-africain : aucun code postal GeoNames pour aucun des onze,
      // champ "cp" = étiquette de division administrative GeoNames informelle
      // (scripts/build-sahel-corne-communes.js).
      // PÉAGES : `hasToll:false` pour les onze. Là où un péage existe (Nigeria, Bénin, Niger, Tchad),
      // il est forfaitaire par barrière — même raisonnement que pour l'Afrique de l'Ouest. Seule
      // l'Éthiopie a un vrai péage KILOMÉTRIQUE (autoroutes de l'Ethiopian Toll Roads Enterprise) :
      // mais son dernier barème au kilomètre publié date du 1er mars 2019 (0,77 Br/km en voiture),
      // la révision d'août 2026 (« 50 à 630 Br » selon catégorie et tronçon) n'est pas détaillée, et
      // le birr a perdu l'essentiel de sa valeur depuis la libéralisation de juillet 2024. Appliquer
      // un tarif de 2019 en 2026 serait un faux chiffre : `hasToll:false`, raison écrite.
      // SÉCURITÉ, lot le plus exposé du projet — voir README. France Diplomatie déconseille
      // formellement TOUT le territoire du Niger, du Soudan et de la Somalie, et la quasi-totalité de
      // la Centrafrique et du Soudan du Sud ; zones rouges étendues au Tchad, au Nigeria, au Bénin, en
      // Éthiopie, en Érythrée et à Djibouti (avis du 15 septembre 2026).
      NE: { code:'NE', name:'Niger', file:'communes-ne.txt', hasToll:false, aliasFile:'aliases-ne.txt', currency:'XOF' },
      BJ: { code:'BJ', name:'Bénin', file:'communes-bj.txt', hasToll:false, aliasFile:'aliases-bj.txt', currency:'XOF' },
      // Nigeria : le plus gros fichier du lot (60 817 communes). Devise NGN, symbole ₦ (U+20A6).
      NG: { code:'NG', name:'Nigeria', file:'communes-ng.txt', hasToll:false, aliasFile:'aliases-ng.txt', currency:'NGN' },
      // Tchad et Centrafrique : franc CFA d'Afrique CENTRALE (XAF), distinct du XOF mais à la même
      // parité fixe de 655,957 pour 1 EUR, zéro décimale.
      TD: { code:'TD', name:'Tchad', file:'communes-td.txt', hasToll:false, aliasFile:'aliases-td.txt', currency:'XAF' },
      CF: { code:'CF', name:'République centrafricaine', file:'communes-cf.txt', hasToll:false, aliasFile:'aliases-cf.txt', currency:'XAF' },
      // Soudan : guerre depuis avril 2023. Le taux officiel de la livre (SDG) et le marché parallèle
      // divergent fortement (6 350-6 400 SDG pour 1 USD au marché fin août 2026, record) : les
      // montants en livres sont indicatifs au mieux.
      SD: { code:'SD', name:'Soudan', file:'communes-sd.txt', hasToll:false, aliasFile:'aliases-sd.txt', currency:'SDG' },
      SS: { code:'SS', name:'Soudan du Sud', file:'communes-ss.txt', hasToll:false, aliasFile:'aliases-ss.txt', currency:'SSP' },
      // Érythrée : nakfa (ERN) arrimé à 15 pour 1 USD. TOUTES les frontières terrestres sont fermées
      // (Soudan, Éthiopie, Djibouti) : le pays est isolé du réseau routier du projet, comme en réalité.
      ER: { code:'ER', name:'Érythrée', file:'communes-er.txt', hasToll:false, aliasFile:'aliases-er.txt', currency:'ERN' },
      ET: { code:'ET', name:'Éthiopie', file:'communes-et.txt', hasToll:false, aliasFile:'aliases-et.txt', currency:'ETB' },
      // Djibouti : franc (DJF) en caisse d'émission, arrimé à 177,721 pour 1 USD, zéro décimale. Seul
      // pays du lot avec si peu de lieux dans GeoNames : 64 communes.
      DJ: { code:'DJ', name:'Djibouti', file:'communes-dj.txt', hasToll:false, aliasFile:'aliases-dj.txt', currency:'DJF' },
      // Somalie : shilling (SOS) au sens de l'ISO, mais l'économie est DOLLARISÉE de fait — aucun billet
      // imprimé depuis 1991, le dollar domine prix, épargne et paiement mobile. Les montants en
      // shillings n'ont qu'une valeur indicative. Le Somaliland, indépendant de fait depuis 1991 et
      // non reconnu, est repris tel que GeoNames le range : sous SO.
      SO: { code:'SO', name:'Somalie', file:'communes-so.txt', hasToll:false, aliasFile:'aliases-so.txt', currency:'SOS' },
      // ── LOT AFRIQUE ORIENTALE, CENTRALE ET AUSTRALE, OCÉAN INDIEN : vingt-quatre pays ─────────────
      // (La Réunion et Mayotte, départements français, restent sous FR — voir landmassOf.)
      // Données : scripts/build-afrique-australe-communes.js — étiquette "XX-<admin1 GeoNames>" ; les
      // fichiers postaux kényan, malawite et sud-africain existent mais ont été mesurés et écartés.
      // PÉAGES : `hasToll:false` pour les vingt-quatre, et la raison diffère de « pas de péage » :
      // Afrique du Sud (SANRAL et concessionnaires, Gazette n° 54087/54088 du 5 février 2026), Zambie
      // (NRFA, K20), Zimbabwe (ZINARA, 3-4 USD), Malawi (MK 2 000), Mozambique (30-240 MT), Ouganda
      // (Entebbe Expressway, UGX 5 000) et Angola (1 500 Kz) ont tous des péages FORFAITAIRES par
      // barrière, sans prix au kilomètre — même raisonnement que pour l'Afrique de l'Ouest. Le seul
      // tarif fonction du trajet, la Nairobi Expressway (KSh 170-500), ne couvre que 27 km urbains :
      // l'étendre à tout le Kenya serait faux. L'e-toll du Gauteng est désactivé depuis le 11 avril
      // 2024. Eswatini (E150) et Lesotho (R80) perçoivent une taxe d'ENTRÉE des véhicules étrangers à
      // la frontière, qui n'est pas un péage routier.
      // SÉCURITÉ (France Diplomatie, avis valides au 15 septembre 2026) : tourisme déconseillé dans
      // toute la RD Congo (épidémie d'Ebola déclarée mi-mai 2026, 7 provinces touchées ; l'est du pays
      // tenu par le M23/AFC) ; zones rouges au Cabo Delgado (Mozambique), dans les Lunda et au Cabinda
      // (Angola), le long de la Somalie (Kenya), des frontières de la RDC (Ouganda, Burundi, Congo) et
      // du Mozambique (Tanzanie). Voir README.
      KE: { code:'KE', name:'Kenya', file:'communes-ke.txt', hasToll:false, aliasFile:'aliases-ke.txt', currency:'KES' },
      UG: { code:'UG', name:'Ouganda', file:'communes-ug.txt', hasToll:false, aliasFile:'aliases-ug.txt', currency:'UGX' },
      TZ: { code:'TZ', name:'Tanzanie', file:'communes-tz.txt', hasToll:false, aliasFile:'aliases-tz.txt', currency:'TZS' },
      RW: { code:'RW', name:'Rwanda', file:'communes-rw.txt', hasToll:false, aliasFile:'aliases-rw.txt', currency:'RWF' },
      BI: { code:'BI', name:'Burundi', file:'communes-bi.txt', hasToll:false, aliasFile:'aliases-bi.txt', currency:'BIF' },
      // RD Congo : franc congolais (CDF) au sens de l'ISO, mais économie largement dollarisée de fait.
      CD: { code:'CD', name:'République démocratique du Congo', file:'communes-cd.txt', hasToll:false, aliasFile:'aliases-cd.txt', currency:'CDF' },
      CG: { code:'CG', name:'République du Congo', file:'communes-cg.txt', hasToll:false, aliasFile:'aliases-cg.txt', currency:'XAF' },
      GA: { code:'GA', name:'Gabon', file:'communes-ga.txt', hasToll:false, aliasFile:'aliases-ga.txt', currency:'XAF' },
      // Guinée équatoriale : 1 965 lieux sur 2 045 sans région dans GeoNames, gardés avec l'étiquette
      // pays seule. Malabo est sur l'île de Bioko, séparée du continent (Río Muni).
      GQ: { code:'GQ', name:'Guinée équatoriale', file:'communes-gq.txt', hasToll:false, aliasFile:'aliases-gq.txt', currency:'XAF' },
      // Sao Tomé-et-Principe : dobra (STN) à parité FIXE de 24,5 pour 1 EUR depuis 2010 (redénominé en
      // 2018, 1 000 STD = 1 STN).
      ST: { code:'ST', name:'Sao Tomé-et-Principe', file:'communes-st.txt', hasToll:false, aliasFile:'aliases-st.txt', currency:'STN' },
      AO: { code:'AO', name:'Angola', file:'communes-ao.txt', hasToll:false, aliasFile:'aliases-ao.txt', currency:'AOA' },
      ZM: { code:'ZM', name:'Zambie', file:'communes-zm.txt', hasToll:false, aliasFile:'aliases-zm.txt', currency:'ZMW' },
      // Malawi : taux officiel quasi fixe (~1 740 MWK pour 1 USD) contre ~4 000 au marché parallèle en
      // mai 2026 — les montants en kwachas sont indicatifs.
      MW: { code:'MW', name:'Malawi', file:'communes-mw.txt', hasToll:false, aliasFile:'aliases-mw.txt', currency:'MWK' },
      MZ: { code:'MZ', name:'Mozambique', file:'communes-mz.txt', hasToll:false, aliasFile:'aliases-mz.txt', currency:'MZN' },
      // Zimbabwe : Zimbabwe Gold (ZWG, « ZiG ») depuis avril 2024, seul code de la liste ISO 4217 de
      // janvier 2026 ; le dollar américain reste d'usage légal et courant (prime parallèle 20-25 %).
      ZW: { code:'ZW', name:'Zimbabwe', file:'communes-zw.txt', hasToll:false, aliasFile:'aliases-zw.txt', currency:'ZWG' },
      BW: { code:'BW', name:'Botswana', file:'communes-bw.txt', hasToll:false, aliasFile:'aliases-bw.txt', currency:'BWP' },
      // Namibie, Eswatini, Lesotho : monnaies à parité 1:1 avec le rand sud-africain (zone monétaire
      // commune), le rand circulant lui-même légalement dans les trois pays.
      NA: { code:'NA', name:'Namibie', file:'communes-na.txt', hasToll:false, aliasFile:'aliases-na.txt', currency:'NAD' },
      ZA: { code:'ZA', name:'Afrique du Sud', file:'communes-za.txt', hasToll:false, aliasFile:'aliases-za.txt', currency:'ZAR' },
      SZ: { code:'SZ', name:'Eswatini', file:'communes-sz.txt', hasToll:false, aliasFile:'aliases-sz.txt', currency:'SZL' },
      LS: { code:'LS', name:'Lesotho', file:'communes-ls.txt', hasToll:false, aliasFile:'aliases-ls.txt', currency:'LSL' },
      // Comores : franc comorien (KMF) à parité FIXE de 491,96775 pour 1 EUR, zéro décimale.
      KM: { code:'KM', name:'Comores', file:'communes-km.txt', hasToll:false, aliasFile:'aliases-km.txt', currency:'KMF' },
      MG: { code:'MG', name:'Madagascar', file:'communes-mg.txt', hasToll:false, aliasFile:'aliases-mg.txt', currency:'MGA' },
      MU: { code:'MU', name:'Maurice', file:'communes-mu.txt', hasToll:false, aliasFile:'aliases-mu.txt', currency:'MUR' },
      SC: { code:'SC', name:'Seychelles', file:'communes-sc.txt', hasToll:false, aliasFile:'aliases-sc.txt', currency:'SCR' },
      // ── CAMEROUN, dernier pays du continent africain (septembre 2026) ──────────────────────────────
      // scripts/build-cameroun-communes.js : aucun fichier postal GeoNames, étiquette "CM-<admin1>".
      // PÉAGES : `hasToll:false`. Le réseau national est à péage FORFAITAIRE (500 FCFA par passage,
      // décret n° 93/034/PM du 7 janvier 1993) ; l'autoroute Kribi-Lolabé (38 km) a une grille par
      // catégorie (1 200 FCFA en voiture, lettre du ministre des Finances du 20 juillet 2022) sans que
      // la nature du système soit publiée ; les tarifs de Yaoundé-Bibodi et Yaoundé-Nsimalen restent
      // introuvables. Aucun prix au kilomètre honnête n'en sort.
      // ADJACENCE : ses six frontières routières sont ouvertes dans le modèle (voir ADJACENT_PAIRS) ; les
      // zones frontalières déconseillées relèvent de TENSION_ZONES (avertissement et filtre).
      // SÉCURITÉ (France Diplomatie) : Extrême-Nord, Nord-Ouest, Mayo-Louti, Bakassi, l'ouest de Kumba
      // et de Mamfe et une bande de 30 km le long du Nigeria, du Tchad et de la Centrafrique en zone
      // rouge ; escorte militaire sur Yaoundé-Ngaoundéré, Garoua-Moundou et Bertoua-Yokadouma ; conduite
      // de nuit formellement déconseillée.
      CM: { code:'CM', name:'Cameroun', file:'communes-cm.txt', hasToll:false, aliasFile:'aliases-cm.txt', currency:'XAF' },
      // ── SAINTE-HÉLÈNE, ASCENSION ET TRISTAN DA CUNHA ─────────────────────────────────────────────────
      // Trois îles à des milliers de kilomètres les unes des autres, chacune isolée (voir ISLAND_BOXES).
      // Le champ "cp" est un VRAI code postal, un par île (STHL 1ZZ, ASCN 1ZZ, TDCU 1ZZ). Livre de
      // Sainte-Hélène (SHP) à parité 1:1 avec la livre sterling (InforEuro septembre 2026 : 0,8572 pour
      // 1 EUR, identique à GBP) ; Tristan da Cunha utilise officiellement la livre sterling elle-même, à la
      // même valeur. Aucun péage. Aucune liaison modélisée : les navires vers Sainte-Hélène (MV Karoline,
      // MACS) n'ont pas de tarif publié, ceux vers Tristan (tarifs publiés : 500 US$ l'aller au tarif
      // touriste) ne prennent pas de véhicule et partent du Cap, hors de toute masse terrestre commune.
      // Accès : permis d'entrée à Sainte-Hélène, e-visa et aucun droit de résidence à Ascension,
      // autorisation du Conseil de l'île à Tristan (FCDO, 10 septembre 2026).
      SH: { code:'SH', name:'Sainte-Hélène, Ascension et Tristan da Cunha', file:'communes-sh.txt', hasToll:false, aliasFile:'aliases-sh.txt', currency:'SHP' },
      // ── ÎLES GLORIEUSES ET JUAN DE NOVA (îles Éparses, TAAF) ─────────────────────────────────────────
      // Choix explicite de l'utilisateur : recherchables, SANS trajet possible. Aucun habitant permanent,
      // aucune route, aucun hébergement, tout débarquement soumis à l'autorisation du préfet des TAAF ;
      // les trois entrées sont les îles elles-mêmes (GeoNames), chacune isolée, population 0 — un départ
      // y aboutit à « itinéraire impossible ». Glorieuses et Juan de Nova sont revendiquées par
      // Madagascar (résolution 34/91 de l'Assemblée générale de l'ONU, 1979) : reprises TELLES QUE
      // GeoNames les range, sous TF. Le code TF couvre ici ces deux îles seulement, pas le reste des TAAF.
      TF: { code:'TF', name:'Îles Glorieuses et Juan de Nova (TAAF)', file:'communes-tf.txt', hasToll:false, aliasFile:'aliases-tf.txt', currency:'EUR' },
      // ── RUSSIE (septembre 2026) ─────────────────────────────────────────────────────────────────────
      // scripts/build-russie-svalbard-communes.js : 173 493 lieux avec leur VRAI code postal (fichier
      // GeoNames RU, pipeline standard), régions en latin (admin1 GeoNames). 124 199 alias, dont 87 023 en
      // russe cyrillique — GeoNames range les noms en translittération latine.
      // SÉCURITÉ : France Diplomatie déconseille FORMELLEMENT tout déplacement dans l'ensemble du pays
      // (fiche du 10 septembre 2026) : tout le pays est en zone rouge dans TENSION_ZONES (avertissement,
      // et exclu des tirages quand le filtre est actif). Ses frontières routières restent ouvertes dans le
      // modèle (voir ADJACENT_PAIRS), y compris celles que des États ont fermées (Finlande depuis 2023…).
      // HÉBERGEMENT : Booking.com et Airbnb ont cessé toute activité en Russie en 2022, et les cartes Visa
      // ou Mastercard émises à l'étranger n'y fonctionnent pas — les liens de réservation générés pour
      // un lieu russe n'aboutiront pas. Limite écrite plutôt que masquée.
      // PÉAGES : `hasToll:false`, et pas faute de données : les autoroutes d'Avtodor ont une vraie
      // grille (2 mars 2026 ; M-11 Solnetchnogorsk-Saint-Pétersbourg 3 900 ₽ pour ~625 km, soit
      // 0,062 €/km ; M-12 0,071 €/km), mais elles ne couvrent qu'~3 600 km, soit ~5 % des routes
      // fédérales et moins de 0,1 % du réseau : appliquer ce tarif à tout trajet russe, comme le moteur le
      // fait pour un pays à péage, le surestimerait presque toujours.
      RU: { code:'RU', name:'Russie', file:'communes-ru.txt', hasToll:false, aliasFile:'aliases-ru.txt', currency:'RUB' },
      // ── SVALBARD ET JAN MAYEN ────────────────────────────────────────────────────────────────────────
      // Codes postaux norvégiens réels (9170 Longyearbyen, 9178 Barentsburg, 9173 Ny-Ålesund, 8099 Jan
      // Mayen). Couronne norvégienne. AUCUNE route ne relie les localités du Svalbard entre elles : chacune
      // est isolée (voir ISLAND_BOXES), seul le secteur de Longyearbyen (Nybyen, Haugen) forme un
      // ensemble. Plus aucune liaison régulière vers Barentsburg en 2026 (« No sailings summer 2026 »,
      // Polar Charter), aucun ferry pour véhicules depuis la Norvège continentale (cargo Bring sur devis).
      // Prix : le Svalbard est bien plus cher que la moyenne norvégienne sur laquelle sont calés les
      // plafonds NOK (Statistics Norway, table 14168 : 2 885 NOK par chambre en juillet 2026 contre 1 602
      // pour la Norvège) — les plafonds NOK, communs aux deux, y sont donc bas.
      // JAN MAYEN : recherchable, SANS trajet (NO_TRIP_LANDMASSES), même choix que pour les îles Éparses —
      // aucun habitant hors du personnel militaire et météorologique, piste fermée aux vols civils, ni
      // port ni hébergement, autorisation préalable obligatoire (Guidelines 2024 de la station).
      SJ: { code:'SJ', name:'Svalbard et Jan Mayen', file:'communes-sj.txt', hasToll:false, aliasFile:'aliases-sj.txt', currency:'NOK' },
      // ── PÉNINSULE ARABIQUE, IRAK ET IRAN (septembre 2026) ───────────────────────────────────────────
      // scripts/build-golfe-communes.js : étiquette "XX-<admin1 GeoNames>" ; le seul fichier « postal »
      // GeoNames du lot (Émirats) contient des numéros d'adresse de bâtiments (Makani), pas des codes postaux.
      // PÉAGES : `hasToll:false` pour les neuf. Salik (Dubaï, 6/4 AED selon l'heure, TVA comprise depuis
      // juin 2026) et Darb (Abou Dhabi, 4 AED en pointe) sont des portiques urbains à FORFAIT par passage ;
      // la chaussée du roi Fahd (Arabie-Bahreïn) un forfait de 35 SAR par traversée depuis le 18 février
      // 2026 ; l'Arabie saoudite, Oman, le Qatar, le Koweït et Bahreïn n'ont pas de routes à péage ; les
      // autoroutes iraniennes (آزادراه) ont un forfait par tronçon dont l'unité (rial ou toman) n'a pu être
      // établie, et qui représente de toute façon moins d'un millième d'euro par kilomètre.
      SA: { code:'SA', name:'Arabie saoudite', file:'communes-sa.txt', hasToll:false, aliasFile:'aliases-sa.txt', currency:'SAR' },
      // Bahreïn : île reliée à l'Arabie saoudite par la chaussée du roi Fahd (route).
      BH: { code:'BH', name:'Bahreïn', file:'communes-bh.txt', hasToll:false, aliasFile:'aliases-bh.txt', currency:'BHD' },
      AE: { code:'AE', name:'Émirats arabes unis', file:'communes-ae.txt', hasToll:false, aliasFile:'aliases-ae.txt', currency:'AED' },
      // Irak : dinar à 1 300 IQD pour 1 USD au taux officiel, ~1 570 au marché parallèle (septembre 2026).
      IQ: { code:'IQ', name:'Irak', file:'communes-iq.txt', hasToll:false, aliasFile:'aliases-iq.txt', currency:'IQD' },
      // Iran : HÉBERGEMENT — Booking.com (retiré en 2018) et Airbnb n'opèrent pas en Iran, et les cartes
      // bancaires étrangères n'y fonctionnent pas (sanctions) : les liens de réservation générés n'aboutiront
      // pas. MONNAIE — rial (IRR) au sens de l'ISO, prix quotidiens exprimés en tomans (10 rials) ; taux
      // InforEuro de septembre 2026 1 600 447 IRR pour 1 €, contre ~2,55 millions au marché libre : montants
      // indicatifs. La suppression de quatre zéros, votée le 5 octobre 2025, n'est pas encore appliquée.
      IR: { code:'IR', name:'Iran', file:'communes-ir.txt', hasToll:false, aliasFile:'aliases-ir.txt', currency:'IRR' },
      KW: { code:'KW', name:'Koweït', file:'communes-kw.txt', hasToll:false, aliasFile:'aliases-kw.txt', currency:'KWD' },
      // Oman : la péninsule de Musandam est une exclave, reliée au reste du pays par la route à travers les Émirats.
      OM: { code:'OM', name:'Oman', file:'communes-om.txt', hasToll:false, aliasFile:'aliases-om.txt', currency:'OMR' },
      QA: { code:'QA', name:'Qatar', file:'communes-qa.txt', hasToll:false, aliasFile:'aliases-qa.txt', currency:'QAR' },
      // Yémen : deux monnaies de fait depuis 2020 (billets d'Aden refusés à Sanaa) — ~535 YER pour 1 USD à
      // Sanaa, ~1 520-1 630 à Aden. Le taux InforEuro (621 YER pour 1 €) correspond au cours de Sanaa.
      YE: { code:'YE', name:'Yémen', file:'communes-ye.txt', hasToll:false, aliasFile:'aliases-ye.txt', currency:'YER' }
    };

    var TRANSPORT = {
      'voiture-thermique': {speed:82, tollClass:1, ferryClass:1},
      'voiture-hybride': {speed:81, tollClass:1, ferryClass:1},
      'voiture-electrique': {speed:78, electric:true, tollClass:1, ferryClass:1},
      'van': {speed:70, tollClass:2, ferryClass:2},
      'moto': {speed:85, tollClass:5, ferryClass:5},
      'velo': {speed:17, tollClass:null, ferryClass:'foot'}
    };

    var EV_RANGE_KM = 320;

    var EV_CHARGE_MARGIN = 0.75;

    var TOLL_RATE_BY_CLASS = { 1: 0.148, 2: 0.230, 5: 0.086 };

    var TOLL_RATE_BY_COUNTRY = {
      FR: TOLL_RATE_BY_CLASS,
      ES: { 1: 0.14, 2: 0.218, 5: 0.081 },
      PT: { 1: 0.036, 2: 0.056, 5: 0.021 },
      IT: { 1: 0.086, 2: 0.133, 5: 0.050 },
      HR: { 1: 0.060, 2: 0.090, 5: 0.030 },
      BA: { 1: 0.097, 2: 0.150, 5: 0.056 },
      RS: { 1: 0.055, 2: 0.083, 5: 0.028 },
      MK: { 1: 0.048, 2: 0.068, 5: 0.029 },
      GR: { 1: 0.064, 2: 0.096, 5: 0.032 },
      // Turquie : dérivé de l'autoroute Gebze-Orhangazi-İzmir (O-5, 384 km de section réellement
      // autoroutière hors bretelles de raccordement — ozaltin.com), en retirant le tarif du pont
      // d'Osmangazi (structure isolée à péage FIXE au franchissement, jamais proportionnel à la
      // distance — même limite déjà acceptée pour le Storebælt danois/le tunnel sous la Manche/le
      // tunnel du Mont-Blanc : non modélisée en tant que telle, simplement exclue du calcul ci-dessous
      // plutôt que traitée comme un ouvrage séparé). Tarifs au 1er juillet 2026 (plusieurs sources
      // convergentes) : trajet complet catégorie 1 (voiture) 2 525 TL dont pont 1 170 TL -> partie
      // autoroutière seule 1 355 TL / 384 km ≈ 3,53 TL/km ; catégorie 2 (minibus/véhicule léger
      // utilitaire) 4 040 TL dont pont 1 870 TL -> 2 170 TL / 384 km ≈ 5,65 TL/km ; catégorie 6
      // (motocyclette) 1 795 TL dont pont 820 TL -> 975 TL / 384 km ≈ 2,54 TL/km. Convertis au taux
      // ~56,3 TRY/EUR retenu pour COUNTRIES.TR.currency.
      TR: { 1: 0.063, 2: 0.101, 5: 0.045 },
      // Azerbaïdjan : dérivé du barème officiel AAYDA pour la route M-1 Bakou-Quba (129 km, unique
      // tronçon à péage réel du pays) — 0,093 AZN/km catégorie 1 (voiture), 0,05 AZN/km catégorie 6
      // (moto), converti au taux ~1,85 AZN/EUR retenu pour COUNTRIES.AZ.currency. Catégorie 2 (van)
      // extrapolée au même ratio classe2/classe1 que la grille France (0,230/0,148 ≈ ×1,554), faute de
      // tarif AAYDA dédié aux véhicules utilitaires légers dans les sources consultées.
      AZ: { 1: 0.050, 2: 0.078, 5: 0.027 },
      // Israël : la route 6 (Kvish Sderot Yisrael/Trans-Israel Highway, Derech Eretz Highways Ltd.)
      // est tarifée AU TRONÇON (système "free-flow" sans barrière), pas au kilomètre — aucun barème
      // officiel €/km n'existe. Approximation dérivée du tarif occasionnel "tous tronçons" (~34 ₪
      // voiture, ~21,7 ₪ moto au 1er avril 2026, kvish6.co.il) rapporté à la longueur totale usuelle
      // de la route 6 (~150 km, seule route de ce nom en Israël) : ~0,227 ₪/km voiture, ~0,145 ₪/km
      // moto, convertis au taux ~3,5 ILS/EUR retenu pour COUNTRIES.IL.currency. Catégorie 2 (van)
      // extrapolée au même ratio classe2/classe1 que la grille France (×1,554), aucun tarif "véhicule
      // utilitaire" distinct publié pour la route 6. Précision plus faible que pour la Turquie/la
      // Bosnie-Herzégovine (dont les corridors de référence ont une longueur officiellement publiée) :
      // à corriger si une longueur exacte de route 6 ou un barème €/km officiel est identifié plus tard.
      IL: { 1: 0.065, 2: 0.101, 5: 0.041 },
      // Maroc : dérivé de la grille tarifaire officielle ADM (tableau HTML de adm.co.ma/fr/
      // grille-tarifaire-sur-le-reseau, consulté le 16/09/2026 — le PDF téléchargeable depuis cette
      // même page est PÉRIMÉ, il affiche encore les tarifs de janvier 2024, piège relevé et évité).
      // Liaison retenue : CASABLANCA-RABAT, 25 / 36 / 43 MAD en classes 1 / 2 / 3, rapportée aux
      // 62 km publiés par ADM pour cette section (PK Hay Riad 0+879 -> bifurcation Casablanca
      // 57+580). C'est la seule liaison de la grille dont le tarif ET la distance officielle portent
      // exactement sur la même section — les autres demanderaient d'additionner des lignes ou de
      // supposer un PK de départ. Le chiffre de "86 km" très répandu en ligne pour Casa-Rabat
      // n'apparaît sur aucune source ADM et n'a pas été utilisé.
      // -> 0,403 / 0,581 / 0,694 MAD/km, convertis à 10,9367 MAD pour 1 EUR (cours de référence
      // Bank Al-Maghrib du 15/09/2026). La classe 5 du projet (moto) reprend la classe 1 d'ADM, qui
      // n'a pas de catégorie moto : une motocyclette entre dans sa classe 1 par définition (deux
      // essieux, hauteur inférieure à 1,30 m).
      MA: { 1: 0.037, 2: 0.053, 5: 0.037 },
      // Tunisie : dérivé du calculateur officiel de la Société Tunisie Autoroutes
      // (tunisieautoroutes.tn/tarif-peages/, consulté le 16/09/2026), barème du décret du
      // 15 juillet 2025. Liaison retenue : A1 Sud M'SAKEN -> SFAX-NORD, 2,600 / 4,300 / 6,000 TND en
      // classes 1 / 2 / 3, rapportée à 97 km calculés sur les PK des barrières publiés par la STA
      // elle-même (M'saken PK 142, Sidi Salah PK 239). Ce tronçon est en péage FERMÉ, donc réellement
      // proportionnel à la distance — contrairement à l'A1 Nord, en péage ouvert à barrières
      // forfaitaires, dont le ratio au kilomètre n'aurait aucun sens pour un trajet partiel. Le site
      // de la STA se contredit par ailleurs sur cette distance (94 km sur sa page Exploitation,
      // 98 km sur sa page A1 Sud) : les PK ont été préférés aux deux, comme donnée la plus primaire.
      // -> 0,0268 / 0,0443 / 0,0619 TND/km, convertis à 3,3730 TND pour 1 EUR (Banque Centrale de
      // Tunisie, 14/09/2026). Classe 5 (moto) = classe 1 "véhicules légers" de la STA, qui n'a pas
      // davantage de catégorie moto que le Maroc.
      TN: { 1: 0.008, 2: 0.013, 5: 0.008 },
      // Sénégal : SEUL pays du lot ouest-africain dont le péage soit proportionnel à la distance.
      // Le tronçon Mbour-Fatick-Kaolack, ouvert le 22 août 2026, est en système FERMÉ (enregistrement
      // à l'entrée, paiement à la sortie) : 3 000 FCFA pour un véhicule particulier sur 100 km, soit
      // 30 FCFA/km, chiffre communiqué par la Société nationale Autoroutes du Sénégal le 24 août 2026
      // en démentant une rumeur. Deux autres mesures indépendantes concordent : Dakar-Kaolack 6 500
      // FCFA pour 184 km (35 FCFA/km) et Ila Touba Thiès-Touba 2 500 FCFA pour 113 km (22 FCFA/km).
      // La valeur basse et la mieux documentée est retenue. Converti à 655,957 FCFA pour 1 EUR
      // (parité FIXE, BCEAO) : 30 / 655,957 = 0,046 €/km en classe 1.
      // Classes 2 et 5 : le concessionnaire Eiffage publie, pour la gare de Thiaroye sur
      // Dakar-AIBD, moto 600 / véhicule léger 1 000 / camionnette 1 500 FCFA — soit 0,6× et 1,5× le
      // tarif voiture. Ces rapports, propres à l'exploitant sénégalais, sont appliqués au tarif
      // kilométrique ci-dessus faute de barème kilométrique publié par classe.
      SN: { 1: 0.046, 2: 0.069, 5: 0.027 }
    };

    var TOLL_MIN_DISTANCE_KM = 60;

    var HR_ISLAND_POSTCODES = {
      cres: ['51550', '51556', '51557'],
      rab: ['51280'],
      ugljan: ['23271', '23273', '23212'],
      dugiOtok: ['23281', '23286', '23287'],
      brac: ['21400', '21405', '21410', '21412', '21420', '21425'],
      solta: ['21430'],
      hvar: ['21450', '21460', '21465', '21469'],
      vis: ['21480', '21485'],
      korcula: ['20260', '20270', '20271', '20274'],
      mljet: ['20225', '20226'],
      lastovo: ['20290']
    };

    var HR_POSTCODE_TO_ISLAND = {};
    Object.keys(HR_ISLAND_POSTCODES).forEach(function(island){
      HR_ISLAND_POSTCODES[island].forEach(function(cp){ HR_POSTCODE_TO_ISLAND[cp] = island; });
    });

    var WADDEN_ISLANDS = ['texel', 'vlieland', 'terschelling', 'ameland', 'schiermonnikoog'];

    var SARDINIA_PROVINCES = ['Cagliari', 'Sassari', 'Nuoro', 'Oristano', 'Sud Sardegna'];

    var SICILY_PROVINCES = ['Agrigento', 'Caltanissetta', 'Catania', 'Enna', 'Messina', 'Palermo', 'Ragusa', 'Siracusa', 'Trapani'];

    var GR_POROS_MAINLAND_NAMES = /Troizín|Galatás|Vídhion/i;

    var GR_ISLAND_PATTERNS = [
      [/^7[0-4]/, 'crete'],
      [/^851/, 'rhodes'],
      [/^853/, 'kos'],
      [/^852/, 'kalymnos'],
      [/^854/, 'leros'],
      [/^855/, 'patmos'],
      [/^857/, 'karpathos'],
      [/^49/, 'corfu'],
      [/^283/, 'ithaca'],   // testé AVANT '28[0-2]' (kefalonia) : préfixe plus spécifique en premier
      [/^28[0-2]/, 'kefalonia'],
      [/^29/, 'zakynthos'],
      [/^80/, 'kythira'],
      [/^814/, 'limnos'],   // testé AVANT '81[0-3]' (lesvos)
      [/^81[0-3]/, 'lesvos'],
      [/^82[0-3]/, 'chios'],
      [/^833/, 'ikaria'],   // testé AVANT '83[0-2]' (samos)
      [/^83[0-2]/, 'samos'],
      [/^841/, 'syros'],
      [/^842/, 'tinos'],
      [/^843/, 'naxos'],
      [/^845/, 'andros'],
      [/^846/, 'mykonos'],
      [/^847/, 'santorini'],
      [/^848/, 'milos'],
      [/^84001$/, 'ios'],   // code isolé au sein du bloc Cyclades non modélisé (voir plus bas)
      [/^84008$/, 'amorgos'], // idem
      [/^844/, 'paros'],
      [/^1801/, 'aegina'],
      [/^1804/, 'hydra'],
      [/^1805/, 'spetses'],
      [/^37002/, 'skiathos'],
      [/^37003/, 'skopelos'],
      [/^37005/, 'alonissos'],
      [/^34007$/, 'skyros'] // code isolé au sein du bloc Eubée (34001-34019), resté continental sinon
    ];

    var FERRY_ROUTES = {
      'continental|corsica': { routeKey:'ferry.route.corsica', durationH:8.5, distanceKm:250, priceByClass:{1:90, 2:140, 5:40, foot:40} },
      'balearic|continental': { routeKey:'ferry.route.balearic', durationH:7.5, distanceKm:230, priceByClass:{1:135, 2:200, 5:55, foot:50} },
      'canary|continental': { routeKey:'ferry.route.canary', durationH:41, distanceKm:1700, priceByClass:{1:280, 2:420, 5:130, foot:150} },
      'continental|sardinia': { routeKey:'ferry.route.sardinia', durationH:11.5, distanceKm:280, priceByClass:{1:100, 2:150, 5:45, foot:45} },
      'continental|sicily': { routeKey:'ferry.route.sicily', durationH:0.4, distanceKm:5, priceByClass:{1:35, 2:55, 5:12, foot:3} },
      'continental|malta': { routeKey:'ferry.route.malta', durationH:1.75, distanceKm:100, priceByClass:{1:120, 2:180, 5:54, foot:54} },
      'gozo|malta': { routeKey:'ferry.route.gozo', durationH:0.42, distanceKm:6, priceByClass:{1:8, 2:12, 5:4, foot:2} },
      'continental|jersey': { routeKey:'ferry.route.jersey', durationH:1.42, distanceKm:110, priceByClass:{1:115, 2:170, 5:50, foot:42} },
      'continental|guernsey': { routeKey:'ferry.route.guernsey', durationH:2, distanceKm:155, priceByClass:{1:115, 2:170, 5:50, foot:42} },
      'guernsey|jersey': { routeKey:'ferry.route.channelIslands', durationH:1.17, distanceKm:65, priceByClass:{1:75, 2:110, 5:35, foot:25} },
      'continental|cres': { routeKey:'ferry.route.cres', durationH:0.33, distanceKm:5, priceByClass:{1:21, 2:31, 5:10, foot:4} },
      'continental|rab': { routeKey:'ferry.route.rab', durationH:0.33, distanceKm:3, priceByClass:{1:18, 2:27, 5:9, foot:4} },
      'continental|ugljan': { routeKey:'ferry.route.ugljan', durationH:0.42, distanceKm:5, priceByClass:{1:17, 2:26, 5:9, foot:4} },
      'continental|dugiOtok': { routeKey:'ferry.route.dugiOtok', durationH:1.75, distanceKm:30, priceByClass:{1:29, 2:43, 5:14, foot:8} },
      'brac|continental': { routeKey:'ferry.route.brac', durationH:0.83, distanceKm:18, priceByClass:{1:26, 2:39, 5:13, foot:7} },
      'continental|solta': { routeKey:'ferry.route.solta', durationH:1, distanceKm:17, priceByClass:{1:24, 2:35, 5:12, foot:6} },
      'continental|hvar': { routeKey:'ferry.route.hvar', durationH:0.5, distanceKm:5, priceByClass:{1:20, 2:30, 5:10, foot:4} },
      'continental|vis': { routeKey:'ferry.route.vis', durationH:2.33, distanceKm:65, priceByClass:{1:52, 2:78, 5:26, foot:12} },
      'continental|korcula': { routeKey:'ferry.route.korcula', durationH:0.33, distanceKm:3, priceByClass:{1:16, 2:24, 5:8, foot:4} },
      'continental|mljet': { routeKey:'ferry.route.mljet', durationH:0.75, distanceKm:12, priceByClass:{1:26, 2:38, 5:13, foot:6} },
      'continental|lastovo': { routeKey:'ferry.route.lastovo', durationH:4.5, distanceKm:110, priceByClass:{1:74, 2:111, 5:37, foot:12} },
      // Douvres-Calais (DFDS/P&O Ferries/Irish Ferries) : la traversée de la Manche la plus courte et
      // la plus empruntée d'Europe, ~34 km, environ 1h30 — bien plus courte en distance que la plupart
      // des lignes ci-dessus mais pas la plus rapide en durée (trafic dense, manœuvres portuaires).
      // Tarif "voiture" de référence ~94 € l'aller (grilles publiques DFDS/P&O, tarif flexible standard
      // hors promotion) ; classes 2/5/foot au même ratio que les traversées courtes comparables
      // ci-dessus (Jersey/Guernesey). Landmasse "greatBritain" : l'Angleterre/l'Écosse/le pays de
      // Galles (voir landmassOf plus bas) — PAS l'Irlande du Nord, géographiquement sur l'île
      // d'Irlande et non sur celle de Grande-Bretagne (aucune ligne de ferry ne la relie encore ici :
      // en attendant l'ajout de l'Irlande, voir landmassOf, ses communes restent temporairement
      // injoignables depuis le reste du Royaume-Uni plutôt que faussement reliées par la route).
      'continental|greatBritain': { routeKey:'ferry.route.doverCalais', durationH:1.5, distanceKm:34, priceByClass:{1:94, 2:140, 5:35, foot:25} },
      // Holyhead-Dublin (Stena Line/Irish Ferries), ~3h15, voiture dès ~179,50 € — préférée à
      // Fishguard-Rosslare (plus longue, ~3h30, et plus chère) : une seule ligne à modéliser entre les
      // deux masses "greatBritain"/"ireland", même logique que "préférer la traversée courte" déjà
      // utilisée pour le détroit de Messine (Sicile) ou les ponts-relais de Pelješac (Croatie).
      // L'Irlande (île) se relie ainsi à la Grande-Bretagne — PAS directement au continent : un trajet
      // France -> Irlande passerait par deux traversées distinctes, un jour différent chacune (Douvres-
      // Calais puis Holyhead-Dublin), cohérent avec le moteur d'étapes existant (chaque hop reste
      // indépendant). Classe 5/foot au même ratio que les traversées longues comparables ci-dessus
      // (Corse/Sardaigne).
      'greatBritain|ireland': { routeKey:'ferry.route.holyheadDublin', durationH:3.25, distanceKm:110, priceByClass:{1:179.5, 2:265, 5:80, foot:45} },
      // Heysham-Douglas (Isle of Man Steam Packet Company, seul opérateur — quasi-monopole historique
      // depuis 1830), ~5h30 en ferry classique ou ~3h45 en fast-craft (MV Manxman) selon la ligne
      // choisie — durée du fast-craft retenue, plus proche du profil des autres traversées longues déjà
      // modélisées. Voiture dès ~98,50 £ (~117 €, taux indicatif). Relie l'île de Man à la Grande-
      // Bretagne, comme l'Irlande — jamais directement au continent, même raisonnement que
      // greatBritain|ireland ci-dessus.
      'greatBritain|isleOfMan': { routeKey:'ferry.route.heyshamDouglas', durationH:3.75, distanceKm:130, priceByClass:{1:117, 2:175, 5:53, foot:35} },
      // Ystad (Suède)-Rønne (Bornholmslinjen, seul opérateur), 1h20, 4 rotations/jour — SEULE vraie
      // ligne de ferry pour véhicules vers Bornholm depuis l'ajout du Danemark (l'ancienne ligne directe
      // Køge-Rønne a fermé au trafic véhicules il y a plusieurs années). Voiture (jusqu'à 5 passagers)
      // dès 599 DKK (~80 €, tarif "Flex" standard modifiable — pas le tarif "Lowprice" promotionnel non
      // remboursable à 99 DKK, même logique que le tarif flexible standard retenu pour Douvres-Calais),
      // bornholmslinjen.com/prices. Classes 2/5/foot au même ratio que les traversées comparables
      // ci-dessus. Landmasse "bornholm" (voir landmassOf plus bas, pays DK) reliée ici à "continental" —
      // pas à un pays en particulier : Ystad est en Suède, mais "continental" désigne déjà toute la masse
      // continentale européenne connectée par la route (France, Allemagne, Pologne...), Suède comprise
      // dès son ajout, cohérent avec le fonctionnement déjà en place pour toutes les autres îles de cette
      // table.
      'bornholm|continental': { routeKey:'ferry.route.bornholm', durationH:1.33, distanceKm:90, priceByClass:{1:80, 2:120, 5:32, foot:28} },
      // Nynäshamn-Visby (Destination Gotland, seul opérateur), ~3h15, plusieurs rotations/jour. Voiture
      // (jusqu'à 5 passagers) dès 1250 SEK (~112 €, tarif standard "Alla+bilen" sur départs sélectionnés,
      // destinationgotland.se/priser-bokningsinfo) ; passager seul dès 399 SEK (~36 €, repris ici comme
      // tarif "foot"). Classes 2/5 au même ratio que les traversées comparables ci-dessus. Une seule
      // vraie île suédoise modélisée : Öland est reliée au continent par un vrai pont routier depuis 1972
      // (Ölandsbron) — déjà "continental" dans ce modèle, sans entrée dédiée.
      'continental|gotland': { routeKey:'ferry.route.gotland', durationH:3.25, distanceKm:150, priceByClass:{1:112, 2:168, 5:45, foot:36} },
      // Turku-Mariehamn (Viking Line, seul opérateur avec liaison directe et régulière — Tallink Silja
      // dessert aussi Mariehamn mais uniquement en escale sur sa ligne Helsinki-Stockholm, pas de
      // liaison directe Turku-Mariehamn), MS Viking Grace (motorisation GNL), ~5h, 2 rotations/jour
      // toute l'année. Voiture ~150 € (estimation, Viking Line ne publie pas de grille tarifaire simple
      // pour les véhicules — vikingline.fi renvoie vers un moteur de réservation ; passager seul ~19 €,
      // agrégateurs 2026). Classes 2/5 au même ratio que les traversées comparables ci-dessus. Landmasse
      // "aland" (voir landmassOf plus bas, pays AX) reliée à "continental" — la Finlande elle-même,
      // n'ayant aucune île sans pont significative en dehors des Åland, n'a besoin d'aucune autre entrée
      // FERRY_ROUTES ni d'aucun cas landmassOf dédié.
      'aland|continental': { routeKey:'ferry.route.aland', durationH:5, distanceKm:150, priceByClass:{1:150, 2:225, 5:65, foot:19} },
      // Grèce — de très loin le plus gros ajout en nombre de lignes de toute cette section (30 îles),
      // à la mesure du réseau réel : la Grèce a plus d'îles habitées reliées par ferry-voiture que
      // tous les autres pays couverts ici réunis. Rien n'est inventé : chaque ligne ci-dessous est une
      // VRAIE liaison régulière, avec un VRAI port de départ, retenue à chaque fois qu'un port
      // continental (ou une île déjà reliée au continent par la route, comme la Grande-Bretagne pour
      // l'Irlande) dessert l'île — jamais un simple "aller-retour Le Pirée" générique. Sources : Blue
      // Star Ferries/Minoan Lines/Seajets/ANEK-Superfast (Le Pirée, Égée), Levante Ferries (Ionienne),
      // KerkyraLines/Kerkyra Seaways (Corfou), Triton Ferries (Cythère), Hellenic Seaways/Alonissos
      // Skopelos Skiathos Shipping Company (Sporades) — agrégées via ferryhopper.com/ferryscanner.com/
      // directferries.com, tarifs "voiture" basse saison 2026. Classe 2 (van) extrapolée au ratio ×1,5
      // déjà utilisé pour la Corse/la Sardaigne/la Croatie faute de grille par catégorie officielle
      // trouvée pour la quasi-totalité des lignes grecques ; classe 5 (moto) extrapolée à ×0,35 du
      // tarif voiture (repli légèrement plus bas que le ×0,45 Corse/Sardaigne/Malte ou le ×0,5 croate/
      // serbe, cohérent avec les rares tarifs "moto" affichés par les agrégateurs sur ces lignes
      // longues, régulièrement sous 40% du tarif voiture) — présomption plutôt que grille vérifiée,
      // même limite déjà assumée pour d'autres pays de cette table. Classe foot = vrai tarif passager
      // publié quand trouvé (la majorité des lignes ci-dessous), estimé par comparaison avec une ligne
      // de profil proche sinon (signalé au cas par cas).
      //
      // ATTENTION - trois destinations RECONNUES par landmassOf/GR_ISLAND_PATTERNS mais SANS entrée
      // FERRY_ROUTES ci-dessous, volontairement : aucune vraie ligne de ferry pour VÉHICULES n'existe
      // à ce jour (2026) vers Hydra ni Spetses (l'île de Hydra interdit même la circulation
      // automobile en dehors de quelques véhicules de service — âne et à pied seulement — et Spetses
      // n'a pas de ligne voiture directe non plus, seulement passager), ni vers Límnos sur sa ligne
      // directe au départ du Pirée (Blue Star/Seajets n'y embarquent pas de véhicules sur cette
      // liaison précise à ce jour). Même traitement que les Açores/Madère plus haut : l'absence
      // d'entrée pour ces trois masses suffit à les rendre injoignables comme étape reliée, sans code
      // spécifique — elles restent accessibles comme point de départ (recherche manuelle) uniquement.
      // Ikaria, elle, EST correctement reliée (voir plus bas) : sa ligne directe accepte bien les
      // véhicules, contrairement à Límnos.
      'continental|crete': { routeKey:'ferry.route.crete', durationH:9.5, distanceKm:330, priceByClass:{1:100, 2:150, 5:35, foot:44} },
      // Le Pirée-Héraklion (Minoan Lines/Blue Star Ferries/Seajets), ~9h30, plusieurs rotations/jour
      // toute l'année — la plus fréquentée de toutes les lignes grecques de cette table, cohérent avec
      // la Crète, plus grande île du pays. Voiture ~79-122,50 €, retenu ~100 € (médiane) ; passager
      // dès ~44 € (tarif Minoan conventionnel). Chania/Réthymnon, les deux autres grands ports crétois,
      // desservis par d'autres lignes comparables — celle d'Héraklion retenue comme représentative.
      'continental|rhodes': { routeKey:'ferry.route.rhodes', durationH:14, distanceKm:460, priceByClass:{1:125, 2:188, 5:44, foot:46.5} },
      // Le Pirée-Rhodes (Blue Star Ferries), la plus longue traversée directe régulière du Dodécanèse
      // depuis Le Pirée (12h50 au plus court, jusqu'à 22h avec escales intermédiaires — 14h retenu comme
      // représentatif). Voiture dès ~125 €, passager dès ~46,50 €.
      'continental|kos': { routeKey:'ferry.route.kos', durationH:11, distanceKm:330, priceByClass:{1:115, 2:173, 5:40, foot:63} },
      // Le Pirée-Kos (ANEK-Superfast/Blue Star Ferries/Seajets), 9h30-14h selon la ligne (11h retenu).
      // Passager 63-84 € (fourchette basse retenue) ; voiture non publiée précisément par les
      // agrégateurs consultés, estimée par comparaison avec les lignes Dodécanèse de profil proche
      // (Kalymnos/Léros, juste après sur le même corridor).
      'continental|kalymnos': { routeKey:'ferry.route.kalymnos', durationH:10, distanceKm:300, priceByClass:{1:120, 2:180, 5:42, foot:45} },
      // Le Pirée-Kálymnos, 9h30-11h, passager dès ~76,50 €... valeur la plus basse trouvée mêlant
      // vraisemblablement un tarif "voiture + passager" combiné plutôt qu'un tarif passager pur — écarté
      // au profit d'une estimation par comparaison avec Léros/Patmos (juste après), même corridor.
      'continental|leros': { routeKey:'ferry.route.leros', durationH:11, distanceKm:280, priceByClass:{1:115, 2:173, 5:40, foot:43} },
      // Le Pirée-Léros, 9h-13h (11h retenu), passager dès ~43 €. Voiture estimée par comparaison avec
      // Kálymnos/Patmos, même corridor Dodécanèse nord.
      'continental|patmos': { routeKey:'ferry.route.patmos', durationH:8, distanceKm:250, priceByClass:{1:110, 2:165, 5:39, foot:43} },
      // Le Pirée-Pátmos, 7h20-12h15 (8h retenu, plutôt vers la borne rapide), passager dès ~43 €.
      // Voiture estimée par comparaison avec Kálymnos/Léros.
      'continental|karpathos': { routeKey:'ferry.route.karpathos', durationH:17, distanceKm:400, priceByClass:{1:140, 2:210, 5:49, foot:50} },
      // Le Pirée-Kárpathos (Blue Star Ferries, 3-4 rotations/semaine), la ligne directe la plus longue
      // en durée de toute cette table (13h30 au plus court, ~17h en moyenne avec escales — île la plus
      // reculée du Dodécanèse desservie ici). Passager 46,50-59 € (borne haute retenue, ~50 €) ; voiture
      // estimée au-dessus de Rhodes (trajet plus long) par extrapolation du même profil tarifaire.
      'continental|corfu': { routeKey:'ferry.route.corfu', durationH:1.33, distanceKm:10, priceByClass:{1:33, 2:50, 5:12, foot:8} },
      // Igoumenitsa-Corfou (KerkyraLines/Kerkyra Seaways), la traversée la plus courte de toute cette
      // table avec les îles Wadden et le détroit de Messine — ~1h20, jusqu'à 25 rotations/jour en haute
      // saison. Voiture 24-40,60 € (33 € retenu, médiane) ; passager ~6-10 € (8 € retenu).
      'continental|kefalonia': { routeKey:'ferry.route.kefalonia', durationH:3.25, distanceKm:220, priceByClass:{1:53, 2:80, 5:19, foot:15.4} },
      // Patras-Sami (Levante Ferries), ~3h-3h30. Tarif "2 adultes + 1 voiture" 83,69 € toutes directions
      // confondues ; passager seul 15,40 € -> voiture seule ≈ 83,69 - 2×15,40 ≈ 53 €.
      'continental|ithaca': { routeKey:'ferry.route.ithaca', durationH:4, distanceKm:250, priceByClass:{1:56, 2:84, 5:20, foot:17} },
      // Patras-Itháki (souvent via Sami/Kefalonia sur la même rotation), un peu plus longue que la
      // ligne directe vers Kefalonia — tarifs estimés par extrapolation proportionnelle à la distance
      // supplémentaire, faute de grille publiée séparément pour Itháki seule.
      'continental|zakynthos': { routeKey:'ferry.route.zakynthos', durationH:1.25, distanceKm:30, priceByClass:{1:39, 2:59, 5:14, foot:12.5} },
      // Kyllini-Zakynthos (Levante Ferries), ~1h15, jusqu'à 7 rotations/jour en haute saison. Tarif
      // "2 adultes + 1 voiture" 64,30 € -> voiture seule ≈ 64,30 - 2×12,50 ≈ 39 € ; passager dès 12,50 €.
      'continental|kythira': { routeKey:'ferry.route.kythira', durationH:1.25, distanceKm:40, priceByClass:{1:45, 2:68, 5:16, foot:12.5} },
      // Néapoli (Laconie, Péloponnèse)-Cythère (Triton Ferries), ~1h15, toute l'année. Tarif "2 adultes
      // + 1 voiture" 69,50 € (sens Néapoli->Cythère) -> voiture seule ≈ 69,50 - 2×12,50 ≈ 45 € ;
      // passager 10,50-12,50 €. Antikythira (code postal 80100, même préfixe "80" dans
      // GR_ISLAND_PATTERNS — voir plus haut) rejoint la même masse "kythira" : îlot minuscule (~20
      // habitants) desservi par la même rotation, sans ligne propre à modéliser.
      'continental|lesvos': { routeKey:'ferry.route.lesvos', durationH:10.5, distanceKm:340, priceByClass:{1:123, 2:185, 5:43, foot:43} },
      // Le Pirée-Mytilène (Blue Star Ferries), 8h46-12h15 (10h30 retenu). Voiture dès ~123 €, passager
      // dès ~43 €.
      'chios|continental': { routeKey:'ferry.route.chios', durationH:7, distanceKm:280, priceByClass:{1:108, 2:162, 5:38, foot:40} },
      // Le Pirée-Chios (Blue Star Ferries), 6h06-8h15 (7h retenu). Voiture dès ~108 €, passager dès ~40 €.
      'continental|samos': { routeKey:'ferry.route.samos', durationH:8.5, distanceKm:310, priceByClass:{1:125, 2:188, 5:44, foot:55} },
      // Le Pirée-Samos (Vathý ou Karlovássi selon la rotation, Blue Star Ferries), 7h30-10h25 (8h30
      // retenu). Voiture dès ~125 €, passager 49,70-60,50 € (55 € retenu, médiane).
      'continental|ikaria': { routeKey:'ferry.route.ikaria', durationH:7, distanceKm:270, priceByClass:{1:115, 2:173, 5:40, foot:50} },
      // Le Pirée-Ikaría (Ágios Kírykos), desservie sur le même corridor que Samos, juste avant sur la
      // rotation — durée et tarifs estimés légèrement EN DESSOUS de Samos par comparaison directe,
      // faute de grille publiée séparément pour Ikaría seule.
      'continental|syros': { routeKey:'ferry.route.syros', durationH:3.5, distanceKm:145, priceByClass:{1:74, 2:111, 5:26, foot:36.5} },
      // Le Pirée-Syros (Blue Star Ferries/Seajets), dès 2h en catamaran rapide (3h30 retenu, plus
      // proche du profil conventionnel dominant dans cette table). Passager dès 36,50 € ; tarif
      // "2 adultes + 1 voiture" 147 € -> voiture seule ≈ 147 - 2×36,50 ≈ 74 €.
      'continental|tinos': { routeKey:'ferry.route.tinos', durationH:4, distanceKm:165, priceByClass:{1:70, 2:105, 5:25, foot:50} },
      // Le Pirée-Tínos (Blue Star Ferries/Seajets), 2h25-5h30 (4h retenu). Passager dès 50 € ; voiture
      // 59-89 € (70 € retenu, médiane).
      'continental|naxos': { routeKey:'ferry.route.naxos', durationH:5, distanceKm:190, priceByClass:{1:65, 2:98, 5:23, foot:42} },
      // Le Pirée-Naxos (Blue Star Ferries), ~5h en ferry conventionnel. Passager 38-52,50 € (42 €
      // retenu) ; voiture estimée par comparaison avec Páros, ligne sœur du même corridor Cyclades
      // centrales.
      'continental|paros': { routeKey:'ferry.route.paros', durationH:4.5, distanceKm:166, priceByClass:{1:75, 2:113, 5:26, foot:51} },
      // Le Pirée-Páros (Blue Star Ferries), 4h-5h35 (4h30 retenu). Passager dès 51 € ; voiture estimée
      // par comparaison avec Naxos/Syros, même corridor.
      'andros|continental': { routeKey:'ferry.route.andros', durationH:2, distanceKm:120, priceByClass:{1:55, 2:83, 5:19, foot:30} },
      // Rafina-Ándros (souvent regroupée avec Le Pirée dans ce modèle par simplicité, comme les autres
      // lignes Cyclades ci-dessus), la plus courte des Cyclades modélisées ici — proximité directe avec
      // l'Attique. Durée et tarifs estimés par comparaison avec Tínos, île voisine de profil proche.
      'continental|mykonos': { routeKey:'ferry.route.mykonos', durationH:3.5, distanceKm:174, priceByClass:{1:128, 2:192, 5:45, foot:53} },
      // Le Pirée-Mýkonos (Blue Star Ferries/Seajets), 2h40-5h50 (3h30 retenu, Blue Star conventionnel
      // 4h40 à 53 €). Voiture dès ~128 €, nettement plus cher que Naxos/Páros à distance comparable —
      // île la plus demandée des Cyclades, prime de fréquentation plutôt qu'une erreur de saisie.
      'continental|santorini': { routeKey:'ferry.route.santorini', durationH:8, distanceKm:240, priceByClass:{1:120, 2:180, 5:42, foot:60} },
      // Le Pirée-Santorin (Blue Star Ferries/Seajets/Fast Ferries/Golden Star Ferries), 6h10-9h10 en
      // conventionnel (8h retenu). Voiture 108-131 € (120 € retenu) ; passager dès ~60 €.
      'continental|milos': { routeKey:'ferry.route.milos', durationH:3.75, distanceKm:160, priceByClass:{1:83, 2:125, 5:29, foot:45} },
      // Le Pirée-Mílos (Seajets/Aegean Sea Lines/Minoan Lines/ANEK Lines/Fast Ferries), 2h30-7h30 selon
      // la ligne (3h45 retenu, proche de la moyenne constatée). Voiture dès ~82,70 € ; passager 33-78,70 €
      // (45 € retenu, plutôt vers la borne basse).
      'continental|ios': { routeKey:'ferry.route.ios', durationH:6, distanceKm:205, priceByClass:{1:95, 2:143, 5:33, foot:39} },
      // Le Pirée-Íos, dès 4h35 pour la ligne la plus rapide (6h retenu, plus proche du profil
      // conventionnel dominant dans cette table). Voiture dès ~95 €, passager dès ~39 €.
      'amorgos|continental': { routeKey:'ferry.route.amorgos', durationH:7, distanceKm:230, priceByClass:{1:118, 2:177, 5:41, foot:43} },
      // Le Pirée-Amorgós (Blue Star Ferries/Seajets), 4h35-9h30 (7h retenu). Voiture dès ~118 €,
      // passager dès ~43 €.
      'aegina|continental': { routeKey:'ferry.route.aegina', durationH:0.67, distanceKm:31, priceByClass:{1:15, 2:23, 5:6, foot:9.5} },
      // Le Pirée-Égine, la plus courte et la plus fréquente des liaisons du golfe Saronique (dès 40 min,
      // très nombreuses rotations/jour). Passager dès 9,50 € ; tarif "2 adultes + 1 voiture" 34 € ->
      // voiture seule ≈ 34 - 2×9,50 ≈ 15 €, cohérent avec une ligne aussi courte et concurrentielle.
      'continental|poros': { routeKey:'ferry.route.poros', durationH:2.5, distanceKm:105, priceByClass:{1:32, 2:48, 5:13, foot:17} },
      // Le Pirée-Poros (golfe Saronique), 1h-2h30 selon la ligne (2h30 retenu). Passager dès 17 € ;
      // voiture estimée par comparaison avec Égine, à distance/tarif proportionnellement plus élevés.
      'continental|skiathos': { routeKey:'ferry.route.skiathos', durationH:1.75, distanceKm:60, priceByClass:{1:91, 2:137, 5:32, foot:30} },
      // Volos-Skiáthos (Hellenic Seaways/ASSS), 1h15-2h25 (1h45 retenu). Tarif "2 adultes + 1 voiture"
      // 150,60 € (sens Volos->Skiáthos) -> voiture seule ≈ 150,60 - 2×30 ≈ 91 € (passager estimé, non
      // publié séparément pour cette ligne précise) ; ligne alternative plus longue au départ d'Agios
      // Konstantinos (~3h, passager dès 37,50 €) écartée au profit de la plus courte, même logique que
      // pour les autres choix de port "le plus court" de cette table.
      'continental|skopelos': { routeKey:'ferry.route.skopelos', durationH:2.5, distanceKm:75, priceByClass:{1:105, 2:158, 5:37, foot:35} },
      // Volos-Skópelos, un peu plus loin que Skiáthos sur la même rotation Sporades — durée et tarifs
      // estimés par extrapolation proportionnelle à la distance supplémentaire.
      'alonissos|continental': { routeKey:'ferry.route.alonissos', durationH:4.75, distanceKm:100, priceByClass:{1:104, 2:156, 5:36, foot:35} },
      // Volos-Alónnisos (liaison directe, Hellenic Seaways/ASSS), 4h25-5h05 (4h45 retenu) — nettement
      // plus longue que Skiáthos/Skópelos, île la plus reculée des Sporades modélisées ici. Tarif
      // "2 adultes + 1 voiture" 173,70 € -> voiture seule ≈ 173,70 - 2×35 ≈ 104 € (passager estimé par
      // comparaison avec Skópelos).
      'continental|skyros': { routeKey:'ferry.route.skyros', durationH:1.75, distanceKm:70, priceByClass:{1:35, 2:53, 5:12, foot:8.5} },
      // Kými (Eubée)-Skýros (ASSS), la seule vraie ligne directe (pas de ligne directe régulière depuis
      // Le Pirée) — ~1h45, 2-3 rotations/jour. Voiture dès ~35 € (jusqu'à 3,70 m ; un peu plus pour les
      // véhicules plus longs, non modélisé ici faute de distinction de longueur ailleurs dans ce
      // projet), passager dès 8,50 €. Kými elle-même reste "continental" (Eubée, reliée au continent
      // par le pont de Chalcis) : seule Skýros bascule vers sa propre masse (voir GR_ISLAND_PATTERNS,
      // code postal 34007, isolé au sein du bloc Eubée sinon continental).
      //
      // Îles Féroé — Tórshavn-Suðuroy (Strandfaraskip Landsins/SSL, seul opérateur, route 7), ~2h05,
      // 2-3 rotations/jour — SEULE vraie liaison ferry de tout l'archipel encore nécessaire pour cette
      // app : les quatre autres îles reliées à un trajet routier réaliste (Streymoy, Eysturoy, Vágar,
      // Sandoy) le sont désormais par tunnel sous-marin à péage (Sandoyartunnilin, ouvert le 21
      // décembre 2023, a été le dernier en date) — ces péages restent néanmoins hors du périmètre de
      // TOLL_RATE_BY_COUNTRY (voir COUNTRIES.FO plus haut, tarifs fixes par ouvrage plutôt qu'un
      // barème €/km). Suðuroy, l'île la plus au sud, reste la seule sans tunnel — un pont sous-marin
      // est bien approuvé (Suðuroyartunnilin) mais son ouverture n'est pas attendue avant 2036 au plus
      // tôt : le ferry reste, à ce jour, l'unique traversée réelle. Tarif "voiture standard" (hors
      // tarif en ligne promotionnel, même logique que le tarif Flex retenu pour Bornholm) 229 DKK,
      // passager 109 DKK (ssl.fo/en/prices/prices-ferries, 2026). Classe 2/5 au même ratio ×1,5/×0,4
      // déjà utilisé pour Bornholm/Gotland (autres lignes danoises de cette table).
      // CORRIGÉ en septembre 2026 : les montants étaient saisis en DKK (229/344/92/109) alors que cette
      // table est en euros (affichage « ~229 € ») — soit un prix environ 7,5 fois trop élevé. Convertis à
      // la parité fixe de la couronne danoise (1 EUR ≈ 7,46 DKK, voir BUDGET_PRICE_MAX.DKK). Clé
      // "faroe|suduroy" : le reste de l'archipel est désormais une masse terrestre propre (voir
      // landmassOf), plus "continental".
      // Orcades et Shetland (Écosse) — NorthLink Ferries, contrat de service public du gouvernement
      // écossais, grille officielle « Timetables and Visitor Fares » valable du 1er janvier au
      // 31 décembre 2026 (northlinkferries.co.uk). Tarif de MOYENNE saison retenu (24 mars-14 juin,
      // 1er septembre-31 octobre), entre la basse et la haute saison ; prix véhicule SEUL, conducteur en
      // sus, cabine non comprise ; converti au taux InforEuro de septembre 2026 (1 EUR = 0,8572 GBP).
      // Le camping-car jusqu'à 6 m paie le prix de la voiture (grille NorthLink), d'où classe 2 = classe 1.
      // Distances : orthodromies calculées entre les ports, non publiées par l'opérateur.
      // - Scrabster ↔ Stromness : voiture £74, moto £23,95, adulte £23,95 ; 1 h 30, 2 à 3 rotations/jour.
      //   Pentland Ferries (Gills Bay ↔ St Margaret's Hope, voiture £55) est une autre traversée réelle,
      //   non retenue : une seule liaison par paire de masses terrestres dans cette table.
      'greatBritain|orkney': { routeKey:'ferry.route.orkney', durationH:1.5, distanceKm:42, priceByClass:{1:86.3, 2:86.3, 5:27.9, foot:27.9} },
      // - Aberdeen ↔ Lerwick : voiture £149, moto £34,50, adulte £37 ; 12 h 30 de nuit en direct, tous les jours.
      'greatBritain|shetland': { routeKey:'ferry.route.shetland', durationH:12.5, distanceKm:339, priceByClass:{1:173.8, 2:173.8, 5:40.2, foot:43.2} },
      // - Kirkwall ↔ Lerwick : voiture £98, moto £28, adulte £21,80 ; 5 h 30 à 7 h 45 selon le sens (6,5 h retenues).
      'orkney|shetland': { routeKey:'ferry.route.orkneyShetland', durationH:6.5, distanceKm:165, priceByClass:{1:114.3, 2:114.3, 5:32.7, foot:25.4} },
      // Islande et Féroé ↔ continent (Smyril Line, MS Norröna, Hirtshals-Tórshavn-Seyðisfjörður) : NON
      // modélisé — aucune grille officielle 2026, tarification dynamique selon le remplissage (seules des
      // offres « à partir de » sont publiées). L'Islande et l'archipel féroïen restent donc sans liaison.
      // Oman — Shannah ↔ île de Masirah, Mwasalat (ex-National Ferries Company), grille publiée sur
      // nfc.mwasalat.om (consultée le 16 septembre 2026, sans date de validité affichée) : voiture 8,400 OMR,
      // 4x4 10,500 (retenu pour la classe van, la grille n'ayant pas de catégorie camping-car), moto 4,200,
      // passager adulte 3,600 ; convertis au taux InforEuro de septembre 2026 (1 EUR = 0,44824 OMR).
      // 1 h, 4 départs par jour dans chaque sens. Distance : orthodromie Shannah-Hilf calculée (18 km).
      // NON modélisées, avec leur raison : Shinas ↔ Khasab (inutile ici — Musandam est reliée au reste
      // d'Oman par la route à travers les Émirats, et l'opérateur local prévient qu'il n'y a « aucun horaire
      // fixe » depuis la crise du détroit d'Ormuz) ; Jizan ↔ Farasan (gratuité officielle connue pour 2023 et
      // le 1er semestre 2024 seulement) ; ferries iraniens vers Qeshm, Hormuz, Kish (tarifs révisés plusieurs
      // fois par an sans grille 2026 trouvée, liaisons suspendues le 13 septembre 2026) ; Dalma (grille
      // partielle) ; Failaka (grille officielle de 2016) ; Socotra et Kamaran (aucune liaison régulière).
      'continental|masirah': { routeKey:'ferry.route.masirah', durationH:1, distanceKm:18, priceByClass:{1:18.7, 2:23.4, 5:9.4, foot:8} },
      'faroe|suduroy': { routeKey:'ferry.route.suduroy', durationH:2.08, distanceKm:65, priceByClass:{1:31, 2:46, 5:12, foot:15} },
      // Turquie, dernier ajout en date : deux vraies traversées pour véhicules dans le détroit des
      // Dardanelles, toutes deux opérées par GESTAŞ (seul opérateur, quasi-monopole historique comme
      // Île de Man Steam Packet/Bornholmslinjen/Destination Gotland déjà rencontrés ci-dessus) — voir
      // landmassOf plus bas pour le détail de la détection par île. Geyikli-Bozcaada : 12 km, ~35 min,
      // voiture 2 365 TL aller-retour soit ~1 183 TL/~21 € l'aller (taux ~56,3 TRY/EUR début septembre
      // 2026, xe.com) — feribotseferleri.com.tr/canakkaleyiseviyoruz.com 2026. Classe 2 (véhicule
      // "moyen") directement tarifée séparément par l'opérateur (2 665 TL AR, ~24 €/aller) plutôt
      // qu'un ratio appliqué, contrairement à la plupart des lignes de cette table où seul le tarif
      // "voiture" est publié.
      'bozcaada|continental': { routeKey:'ferry.route.bozcaada', durationH:0.58, distanceKm:12, priceByClass:{1:21, 2:24, 5:9, foot:2} },
      // Kabatepe-Gökçeada : 30 km, 1h15, voiture 1 400 TL aller-retour soit ~700 TL/~12 € l'aller —
      // même source/même taux que Bozcaada ci-dessus. Classe 2/5 estimées au même ratio que Bozcaada
      // (même opérateur, même type de navire), faute de tarif "véhicule moyen" publié séparément pour
      // cette ligne précise.
      'continental|gokceada': { routeKey:'ferry.route.gokceada', durationH:1.25, distanceKm:30, priceByClass:{1:12, 2:14, 5:5, foot:2} },
      // ── CAP-VERT : neuf îles habitées, huit liaisons ────────────────────────────────────────
      // Premier pays du projet dont TOUT le territoire est insulaire. Sans ces liaisons, chaque île
      // serait un cul-de-sac. C'est aussi le seul jeu de données de tout le lot ouest-africain à
      // satisfaire le critère du projet : un vrai prix PAR CATÉGORIE DE VÉHICULE, publié et daté.
      // Exploitant : CV Interilhas, concession de service public de vingt ans signée en 2019.
      // Tarifs : grilles officielles de l'exploitant (tariff_mercadorias.pdf et tariff_passageiros.pdf),
      // base légale **Despacho n.º 01/2024, publié au Boletim Oficial du 11 janvier 2024**, en vigueur
      // depuis le 1er février 2024, actualisation portuaire du 28 mai 2026. Montants lus dans les
      // matrices île par île, converties à la parité FIXE de 110,265 escudos pour 1 EUR :
      //   classe 1 = « automóvel ligeiro » · classe 2 = « furgoneta » · classe 5 = « moto/jetski »
      //   foot     = tarif passager national
      // AUCUNE classe n'est extrapolée ici : les quatre sont publiées pour les huit liaisons.
      // Durées et distances : programmation officielle des voyages de CV Interilhas (fenêtre du
      // 27 août au 25 novembre 2026) et distances en milles nautiques publiées par l'exploitant.
      // Les huit liaisons retenues forment une chaîne connectant les neuf îles habitées ; les autres
      // paires de la matrice existent aussi au tarif mais passent par ces mêmes escales.
      // À noter, hors modèle : Santo Antão et Brava n'ont AUCUN aéroport commercial (fermés
      // respectivement après le crash du vol TACV 5002 en 1999 et pour vents dangereux en 2004) —
      // le ferry y est le seul accès. Et AUCUNE liaison ne relie le Cap-Vert au continent.
      'santoAntao|saoVicente': { routeKey:'ferry.route.cvSantoAntao', durationH:1, distanceKm:15, priceByClass:{1:31, 2:38, 5:8, foot:9} },
      'saoNicolau|saoVicente': { routeKey:'ferry.route.cvSaoNicolau', durationH:5, distanceKm:81, priceByClass:{1:84, 2:171, 5:18, foot:17} },
      'sal|saoNicolau': { routeKey:'ferry.route.cvSalSaoNicolau', durationH:8, distanceKm:159, priceByClass:{1:147, 2:290, 5:33, foot:30} },
      'boaVista|sal': { routeKey:'ferry.route.cvSalBoaVista', durationH:3, distanceKm:69, priceByClass:{1:84, 2:171, 5:18, foot:15} },
      'boaVista|santiago': { routeKey:'ferry.route.cvBoaVistaSantiago', durationH:7, distanceKm:154, priceByClass:{1:147, 2:290, 5:33, foot:30} },
      'maio|santiago': { routeKey:'ferry.route.cvMaio', durationH:2, distanceKm:39, priceByClass:{1:75, 2:146, 5:18, foot:14} },
      // Russie — deux liaisons à GRILLE OFFICIELLE en vigueur, prix véhicule SEUL (convention de cette
      // table), TVA russe de 22 % incluse, convertis au taux InforEuro de septembre 2026 (100,57 ₽/€).
      // Vanino-Kholmsk (Sakhaline), SASCO : véhicules 6 811,26 ₽/m + arrimage 46,36 ₽/m (grille du
      // 1er juillet 2026), calculés pour une voiture de 5 m (34 288 ₽ ≈ 341 €) et un van de 6 m
      // (41 146 ₽ ≈ 409 €) — la longueur est un choix de modélisation, la grille étant au mètre ; moto
      // 7 776,28 ₽ (≈ 77 €) ; passager en cabine 4 places pont principal 1 432 ₽ (≈ 14 €, tarif du
      // 1er janvier 2026, disponible toute l'année, contrairement au siège à 759 ₽ réservé à l'été).
      // 18-20 h de traversée sans horaire fixe ; distance : orthodromie Vanino-Kholmsk calculée (264 km),
      // non publiée par l'opérateur.
      'continental|sakhalin': { routeKey:'ferry.route.sakhalin', durationH:19, distanceKm:264, priceByClass:{1:341, 2:409, 5:77, foot:14} },
      'fogo|santiago': { routeKey:'ferry.route.cvFogo', durationH:4, distanceKm:113, priceByClass:{1:96, 2:171, 5:33, foot:27} },
      'brava|fogo': { routeKey:'ferry.route.cvBrava', durationH:1, distanceKm:19, priceByClass:{1:37, 2:60, 5:16, foot:9} }
    };
    // Les cinq îles Wadden partagent toutes le même tarif (celui de TESO/Texel, voir "Ferries" du
    // README) : ajoutées par boucle plutôt que répétées cinq fois à la main dans la table ci-dessus.
    WADDEN_ISLANDS.forEach(function(island){
      FERRY_ROUTES['continental|wadden-' + island] = { routeKey:'ferry.route.wadden', durationH:0.33, distanceKm:5, priceByClass:{1:18, 2:27, 5:9, foot:6} };
    });

    // ── TRAVERSÉES ENTRE ZONES (SEA_CROSSINGS) ────────────────────────────────────────────────
    // FERRY_ROUTES ci-dessus relie deux MASSES TERRESTRES différentes. Ceuta et Melilla ne rentrent
    // pas dans ce moule : villes espagnoles bâties sur le CONTINENT AFRICAIN, elles sont séparées de
    // l'Espagne par la mer ET frontalières du Maroc par la terre. Leur donner une masse terrestre
    // propre aurait fait disparaître la frontière marocaine ; les laisser "continentales" laissait le
    // moteur traverser le détroit de Gibraltar par la route — un bug réel, mesuré avant correction :
    // sur 100 trajets tirés depuis Algésiras, l'un passait par Ceuta sans aucun segment de ferry.
    // D'où cette seconde table, indexée non par masse terrestre mais par ZONE (voir zoneOf() dans
    // lib/trip-engine.js et app.js) : elle décrit une traversée obligatoire ENTRE DEUX ZONES d'une
    // même masse terrestre. Ceuta et Melilla gardent donc leur frontière terrestre avec le Maroc,
    // tout en n'étant atteignables depuis l'Espagne péninsulaire que par ferry.
    //
    // Seules DEUX liaisons y figurent, et ce sont précisément les deux seules de toute la
    // Méditerranée occidentale dont le tarif PAR VÉHICULE soit publié plutôt que dynamique :
    // - Algésiras-Ceuta : 1h30 en ferry conventionnel (1h en navire rapide), 31,5 km, 10+ départs
    //   par jour toute l'année, deux opérateurs solides (Baleària et DFDS). Tarifs publiés par
    //   Baleària : passager 35 €, voiture 50 €, caravane 99 €.
    // - Málaga-Melilla : 6h30, 210 km, 6 rotations par semaine toute l'année (ligne d'intérêt
    //   public). Tarifs MAXIMAUX CONTRACTUELS, garantis jusqu'au 31/12/2027 : fauteuil standard
    //   50 €, véhicule de tourisme jusqu'à 5,5 × 2,2 × 2 m = 40 €.
    // LIMITE ASSUMÉE, choix explicite de l'utilisateur : aucun opérateur ne publie de tarif MOTO sur
    // ces deux lignes, ni de tarif utilitaire sur Melilla (le plafond contractuel ne couvre que le
    // "véhicule de tourisme"). Ces classes reprennent donc le tarif VOITURE — un choix de
    // modélisation, pas un tarif réel, et dont l'erreur va toujours vers la surestimation.
    // Les traversées Espagne-Maroc, France/Italie-Tunisie et Europe-Algérie existent bel et bien mais
    // ne sont PAS modélisées : toute l'Afrique du Nord partage la masse continentale eurasiatique via
    // le Sinaï, si bien qu'y ouvrir une liaison maritime rendrait aussi possible un trajet ROUTIER
    // fictif à travers la Méditerranée. S'y ajoute que ces lignes sont en tarification dynamique,
    // sans grille par véhicule vérifiable — même motif de non-inclusion que pour Limassol-Le Pirée.
    // Rattachement de chaque concelho capverdien à son île, par CODE et jamais par nom : deux
    // concelhos portent un nom presque identique sur deux îles différentes (Santa Catarina sur
    // Santiago, Santa Catarina do Fogo sur Fogo). Le rattachement par coordonnées a été écarté après
    // avoir trouvé une anomalie dans GeoNames — la localité de Ponta Verde est rattachée au concelho
    // de São Filipe, sur Fogo, mais porte des coordonnées situées sur Santiago. Le code admin1 fait
    // foi, conformément au principe « GeoNames tel quel » du projet.
    // Lot Afrique orientale, centrale et australe / océan Indien : îles reconnues par BOÎTE de
    // coordonnées [clé, latMin, latMax, lonMin, lonMax], complétée par le code de région quand il
    // suffit (Zanzibar, voir landmassOf). Contrairement au Cap-Vert, les coordonnées sont ici fiables
    // et le code de région souvent absent (Guinée équatoriale : 1 965 lieux sur 2 045 sans région).
    // Chaque boîte a été VÉRIFIÉE contre les lieux réellement publiés avant d'être retenue :
    // - aucun lieu du continent ou d'une île voisine n'y tombe (lieux proches hors boîte relus un à
    //   un : Mokowe, Ankify, Manompana, Bagamoyo, Cogo… tous correctement exclus) ;
    // - Zanzibar : les boîtes d'Unguja et de Pemba retrouvent exactement les lieux des régions
    //   GeoNames TZ-21/22/25 et TZ-13/20, à un îlot près (Move, au large de Pemba).
    // Limites assumées : Nosy Komba, Manda (archipel de Lamu) et Rusinga (reliée au continent par une
    // digue) ne sont pas isolées ; dans les pays entièrement insulaires, un lieu hors de toute boîte
    // (Silhouette et îles extérieures des Seychelles, Agaléga et Saint-Brandon…) est isolé seul.
    // AUCUNE de ces îles n'a de liaison modélisée : aucune ligne de la zone n'a de grille tarifaire
    // publiée et vérifiable (voir README, section Ferries) — un trajet qui part d'une île y reste.
    var ISLAND_BOXES = {
      TZ: [['mafia', -8.05, -7.60, 39.55, 39.95], ['ukerewe', -2.20, -1.90, 32.85, 33.35]],
      KE: [['lamu', -2.32, -2.20, 40.875, 40.94], ['mfangano', -0.53, -0.40, 34.00, 34.12]],
      UG: [['ssese', -0.60, -0.20, 32.05, 32.60]],
      MW: [['likoma', -12.15, -11.95, 34.68, 34.78], ['chizumulu', -12.05, -11.97, 34.58, 34.66]],
      CD: [['idjwi', -2.30, -1.90, 29.00, 29.20]],
      MG: [['nosyBe', -13.45, -13.15, 48.15, 48.37], ['sainteMarie', -17.15, -16.65, 49.78, 50.05]],
      GQ: [['bioko', 3.10, 3.85, 8.40, 9.00], ['annobon', -1.60, -1.30, 5.50, 5.75], ['corisco', 0.85, 0.97, 9.25, 9.40]],
      KM: [['grandeComore', -11.95, -11.30, 43.15, 43.55], ['moheli', -12.45, -12.20, 43.60, 43.90], ['anjouan', -12.42, -12.00, 44.15, 44.60]],
      ST: [['principe', 1.45, 1.80, 7.25, 7.50], ['saoTome', -0.05, 0.45, 6.40, 6.80]],
      MU: [['mauritius', -20.60, -19.90, 57.25, 57.85], ['rodrigues', -19.85, -19.60, 63.30, 63.55]],
      SH: [['ascension', -8.00, -7.85, -14.45, -14.28], ['saintHelena', -16.05, -15.88, -5.80, -5.63], ['tristan', -37.15, -37.00, -12.40, -12.20]],
      TF: [],
      // Péninsule Arabique et Iran : îles habitées sans pont ni route, chaque boîte vérifiée contre les lieux
      // publiés (les lieux proches hors boîte relus un à un : Bandar Pol, Bandar Abbas, Aş Şalīf, Shannah…
      // tous continentaux, correctement exclus). Qeshm en deux boîtes : sa côte nord-est (Qeshm, Ţūlā) monte
      // au-delà de 26,95° N, alors que Bandar Pol, en face, sur le continent, est à 27,0° N plus à l'ouest.
      // Seule Masirah a une liaison modélisée (FERRY_ROUTES) ; les autres restent isolées — voir README.
      IR: [['qeshm', 26.52, 26.95, 55.25, 56.30], ['qeshm', 26.95, 27.00, 56.00, 56.30], ['hormuz', 27.03, 27.11, 56.42, 56.50],
           ['larak', 26.82, 26.90, 56.33, 56.40], ['kish', 26.48, 26.60, 53.88, 54.06], ['kharg', 29.20, 29.30, 50.28, 50.36],
           ['lavan', 26.76, 26.84, 53.10, 53.40], ['greaterTunb', 26.24, 26.28, 55.27, 55.33]],
      YE: [['socotra', 12.10, 12.80, 53.20, 54.60], ['abdAlKuri', 11.90, 12.30, 51.90, 52.50], ['kamaran', 15.28, 15.42, 42.55, 42.65]],
      SA: [['farasan', 16.55, 17.00, 41.60, 42.25]],
      KW: [['failaka', 29.40, 29.47, 48.25, 48.42]],
      AE: [['sirBaniYas', 24.28, 24.36, 52.55, 52.66], ['abuMusa', 25.85, 25.90, 54.99, 55.06]],
      OM: [['masirah', 20.10, 20.72, 58.55, 59.00]],
      // Svalbard : aucune route entre localités — seul le secteur de Longyearbyen est un ensemble ; tout
      // autre lieu est isolé seul (SJ dans ISLAND_ONLY_COUNTRIES). Jan Mayen : sans trajet.
      SJ: [['longyearbyen', 78.19, 78.24, 15.50, 15.72], ['janMayen', 70.70, 71.20, -9.20, -7.80]],
      // Russie : zones sans liaison routière avec le reste du réseau (vérifiées contre les lieux publiés).
      // Norilsk-Doudinka (accès par le fleuve Ienisseï seulement) et les îles Solovetski.
      RU: [['norilsk', 69.00, 69.90, 85.90, 88.90], ['solovki', 64.95, 65.20, 35.40, 36.30]],
      SC: [['mahe', -4.85, -4.55, 55.35, 55.56], ['praslin', -4.37, -4.27, 55.65, 55.79], ['laDigue', -4.40, -4.33, 55.81, 55.87]]
    };
    var ISLAND_ONLY_COUNTRIES = { KM: true, ST: true, MU: true, SC: true, SH: true, TF: true, SJ: true };
    // Masses terrestres où aucun trajet n'est proposé, même si plusieurs lieux y existent : accès civil
    // soumis à autorisation, sans hébergement ni liaison publique (choix de l'utilisateur).
    var NO_TRIP_LANDMASSES = { janMayen: true };

    // ZONES À TENSION — rempli par scripts/build-tension-zones.js (voir ce script et le README).
    var TENSION_ZONES = [
      {"country":"TD","level":"orange","label":"Tout le pays (hors zones rouges)","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"TD","level":"red","label":"Provinces du Tibesti et de l'Ennedi (hors Bardaï, Fada, Amdjarass)","match":{"regions":["Tibesti","Ennedi-Est","Ennedi-Ouest"]},"except":{"near":[{"name":"Bardaï","lat":21.36,"lon":17,"km":15},{"name":"Fada","lat":17.18,"lon":21.58,"km":15},{"name":"Amdjarass","lat":16.07,"lon":22.84,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"TD","level":"red","label":"Est de la province du Borkou (approximation par cercle)","match":{"near":[{"name":"Est du Borkou","lat":19.8,"lon":20.8,"km":120}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"TD","level":"red","label":"Province du Lac (hors ville de Bol)","match":{"regions":["Lac"]},"except":{"near":[{"name":"Bol","lat":13.46,"lon":14.71,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"TD","level":"red","label":"Zones frontalières (bande de 30 km, approximation)","match":{"borderKm":30,"with":"LY"},"except":{"near":[{"name":"N'Djamena","lat":12.11,"lon":15.04,"km":20},{"name":"Bongor","lat":10.28,"lon":15.37,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"TD","level":"red","label":"Zones frontalières (bande de 30 km, approximation)","match":{"borderKm":30,"with":"NE"},"except":{"near":[{"name":"N'Djamena","lat":12.11,"lon":15.04,"km":20},{"name":"Bongor","lat":10.28,"lon":15.37,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"TD","level":"red","label":"Zones frontalières (bande de 30 km, approximation)","match":{"borderKm":30,"with":"NG"},"except":{"near":[{"name":"N'Djamena","lat":12.11,"lon":15.04,"km":20},{"name":"Bongor","lat":10.28,"lon":15.37,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"TD","level":"red","label":"Zones frontalières (bande de 30 km, approximation)","match":{"borderKm":30,"with":"CM"},"except":{"near":[{"name":"N'Djamena","lat":12.11,"lon":15.04,"km":20},{"name":"Bongor","lat":10.28,"lon":15.37,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"TD","level":"red","label":"Zones frontalières (bande de 30 km, approximation)","match":{"borderKm":30,"with":"CF"},"except":{"near":[{"name":"N'Djamena","lat":12.11,"lon":15.04,"km":20},{"name":"Bongor","lat":10.28,"lon":15.37,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"TD","level":"red","label":"Zones frontalières (bande de 30 km, approximation)","match":{"borderKm":30,"with":"SD"},"except":{"near":[{"name":"N'Djamena","lat":12.11,"lon":15.04,"km":20},{"name":"Bongor","lat":10.28,"lon":15.37,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tchad/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"CF","level":"red","label":"Tout le pays sauf Bangui et Bimbo","match":{"all":true},"except":{"near":[{"name":"Bangui","lat":4.39,"lon":18.56,"km":12},{"name":"Bimbo","lat":4.26,"lon":18.42,"km":8}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/republique-centrafricaine/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"CF","level":"orange","label":"Bangui et Bimbo","match":{"near":[{"name":"Bangui","lat":4.39,"lon":18.56,"km":12},{"name":"Bimbo","lat":4.26,"lon":18.42,"km":8}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/republique-centrafricaine/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"CM","level":"red","label":"Régions de l'Extrême-Nord et du Nord-Ouest","match":{"regions":["Far North","North-West"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CM","level":"red","label":"Département du Mayo-Louti (approximation par cercle autour de Guider)","match":{"near":[{"name":"Guider (Mayo-Louti)","lat":9.93,"lon":13.95,"km":40}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CM","level":"red","label":"Frontière avec le Nigéria (30 km)","match":{"borderKm":30,"with":"NG"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CM","level":"red","label":"Frontière avec le Tchad (30 km)","match":{"borderKm":30,"with":"TD"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CM","level":"red","label":"Frontière avec la Centrafrique (30 km)","match":{"borderKm":30,"with":"CF"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CM","level":"red","label":"Presqu'île de Bakassi, parc de Korup et ouest de Kumba et Mamfe (approximation par cercles)","match":{"near":[{"name":"Presqu’île de Bakassi","lat":4.7,"lon":8.65,"km":25},{"name":"Parc national de Korup","lat":5.07,"lon":8.85,"km":30},{"name":"Ouest de Kumba","lat":4.85,"lon":9.1,"km":35},{"name":"Ouest de Mamfe","lat":5.75,"lon":9.05,"km":30}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CM","level":"orange","label":"Régions du Nord et du Sud-Ouest","match":{"regions":["North","South-West"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CM","level":"orange","label":"Départements de la Vina et du Mbéré (Adamaoua, approximation par cercles)","match":{"near":[{"name":"Ngaoundéré (Vina)","lat":7.32,"lon":13.58,"km":60},{"name":"Meiganga (Mbéré)","lat":6.52,"lon":14.29,"km":60}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CM","level":"orange","label":"Ouest : zones frontalières du Nord-Ouest/Sud-Ouest et abords du lac Bamendjing (approximation par cercles)","match":{"near":[{"name":"Santchou","lat":5.27,"lon":9.97,"km":15},{"name":"Dschang","lat":5.45,"lon":10.05,"km":20},{"name":"Mbouda","lat":5.63,"lon":10.25,"km":20},{"name":"Lac Bamendjing (+20 km)","lat":5.8,"lon":10.5,"km":35},{"name":"Magba","lat":5.97,"lon":11.22,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CM","level":"orange","label":"Est : bande frontalière avec la Centrafrique au-delà des 30 km rouges (d'après la carte, ~60 km)","match":{"borderKm":60,"with":"CF"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cameroun/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"SD","level":"red","label":"Tout le pays (y compris Khartoum et Port-Soudan)","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/soudan/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"SS","level":"red","label":"Tout le pays sauf Djouba, Wau, Yambio et Aweil","match":{"all":true},"except":{"near":[{"name":"Djouba","lat":4.85,"lon":31.58,"km":12},{"name":"Wau","lat":7.7,"lon":27.99,"km":10},{"name":"Yambio","lat":4.57,"lon":28.4,"km":10},{"name":"Aweil","lat":8.77,"lon":27.4,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/soudan-du-sud/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"SS","level":"orange","label":"Djouba, Wau, Yambio et Aweil (accès par voie aérienne uniquement)","match":{"near":[{"name":"Djouba","lat":4.85,"lon":31.58,"km":12},{"name":"Wau","lat":7.7,"lon":27.99,"km":10},{"name":"Yambio","lat":4.57,"lon":28.4,"km":10},{"name":"Aweil","lat":8.77,"lon":27.4,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/soudan-du-sud/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"ER","level":"orange","label":"Tout le pays en dehors d'Asmara (et de Massaoua)","match":{"all":true},"except":{"near":[{"name":"Asmara","lat":15.33,"lon":38.93,"km":12},{"name":"Massaoua","lat":15.61,"lon":39.45,"km":8}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/erythree/conseils-aux-voyageurs-securite","date":"2026-07-10"},
      {"country":"ER","level":"red","label":"Région de la mer Rouge du Sud (d'après la carte)","match":{"regions":["Southern Red Sea"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/erythree/conseils-aux-voyageurs-securite","date":"2026-07-10"},
      {"country":"ER","level":"red","label":"Frontière avec l'Éthiopie (bande ~25 km d'après la carte)","match":{"borderKm":25,"with":"ET"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/erythree/conseils-aux-voyageurs-securite","date":"2026-07-10"},
      {"country":"ER","level":"red","label":"Frontière avec le Soudan (bande ~25 km d'après la carte)","match":{"borderKm":25,"with":"SD"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/erythree/conseils-aux-voyageurs-securite","date":"2026-07-10"},
      {"country":"ET","level":"red","label":"Régions Amhara, Tigré et Gambela","match":{"regions":["Amhara","Tigray","Gambela"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"red","label":"Frontière avec l'Érythrée (bande ~30 km)","match":{"borderKm":30,"with":"ER"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"red","label":"Frontière avec le Soudan (bande ~30 km)","match":{"borderKm":30,"with":"SD"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"red","label":"Frontière avec le Soudan du Sud (bande ~30 km)","match":{"borderKm":30,"with":"SS"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"red","label":"Frontière avec le Kenya (bande ~30 km, hors Moyale)","match":{"borderKm":30,"with":"KE"},"except":{"near":[{"name":"Moyale","lat":3.53,"lon":39.05,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"red","label":"Frontière avec la Somalie (Ogaden oriental, bande ~80 km d'après la carte)","match":{"borderKm":80,"with":"SO"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"red","label":"Ouest Oromia : Wellega Ouest et Est, Horo Guduru, Shewa Ouest/Nord à l'ouest d'Ambo–Fitche (approximation par cercles)","match":{"near":[{"name":"Gimbi (Wellega Ouest)","lat":9.17,"lon":35.83,"km":80},{"name":"Nekemte (Wellega Est)","lat":9.09,"lon":36.55,"km":70},{"name":"Shambu (Horo Guduru)","lat":9.57,"lon":37.1,"km":50},{"name":"Shewa Ouest (ouest Ambo–Fitche)","lat":9.35,"lon":37.95,"km":55},{"name":"Fitche","lat":9.8,"lon":38.73,"km":40}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"orange","label":"Région Somali (ouest de l'Ogaden)","match":{"regions":["Somali"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"orange","label":"Région Benishangul-Gumuz (Metekel, Kamashi)","match":{"regions":["Bīnshangul Gumuz"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"orange","label":"Afar : frontière avec Djibouti (bande ~30 km)","match":{"borderKm":30,"with":"DJ"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"orange","label":"Afar : zone frontalière avec le Tigré (approximation par cercle autour d'Abala)","match":{"near":[{"name":"Abala","lat":13.36,"lon":39.75,"km":60}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"ET","level":"orange","label":"Oromia : ouest, nord (Shewa), axe Adama–Mieso, Arsi, Guji, Gedeo, Amaro, Burji, Moyale (approximation par cercles)","match":{"near":[{"name":"Ouest Oromia (Wellega/Illubabor)","lat":9.17,"lon":35.83,"km":150},{"name":"Nord Shewa (Oromia)","lat":9.7,"lon":38.75,"km":70},{"name":"Adama","lat":8.54,"lon":39.27,"km":15},{"name":"Axe Adama–Metehara","lat":8.72,"lon":39.6,"km":15},{"name":"Metehara","lat":8.9,"lon":39.92,"km":15},{"name":"Awash","lat":8.98,"lon":40.17,"km":15},{"name":"Axe Awash–Mieso","lat":9.1,"lon":40.45,"km":15},{"name":"Mieso","lat":9.23,"lon":40.75,"km":15},{"name":"Arsi","lat":7.6,"lon":39.6,"km":90},{"name":"Guji (Negele)","lat":5.33,"lon":39.58,"km":80},{"name":"Gedeo (Dilla)","lat":6.41,"lon":38.31,"km":25},{"name":"Amaro","lat":5.83,"lon":37.97,"km":25},{"name":"Burji","lat":5.47,"lon":37.9,"km":20},{"name":"Moyale","lat":3.53,"lon":39.05,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ethiopie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"DJ","level":"red","label":"Zone frontalière avec l'Érythrée (bande ~15 km d'après la carte)","match":{"borderKm":15,"with":"ER"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/djibouti/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"DJ","level":"red","label":"Zone frontalière avec la Somalie/Somaliland (route de Loyada, bande ~5 km)","match":{"borderKm":5,"with":"SO"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/djibouti/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"DJ","level":"red","label":"Archipel des Sept-Frères (Sawabi) hors excursions organisées","match":{"near":[{"name":"Archipel des Sept-Frères","lat":12.47,"lon":43.43,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/djibouti/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"SO","level":"red","label":"Tout le pays sauf Hargeisa, Berbera et l'axe qui les relie","match":{"all":true},"except":{"near":[{"name":"Hargeisa","lat":9.56,"lon":44.06,"km":15},{"name":"Axe Hargeisa–Berbera","lat":9.8,"lon":44.35,"km":10},{"name":"Axe Hargeisa–Berbera","lat":10.05,"lon":44.65,"km":10},{"name":"Axe Hargeisa–Berbera","lat":10.25,"lon":44.85,"km":10},{"name":"Berbera","lat":10.44,"lon":45.01,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/somalie/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"SO","level":"orange","label":"Hargeisa, Berbera et l'axe qui les relie (axe approximé par cercles)","match":{"near":[{"name":"Hargeisa","lat":9.56,"lon":44.06,"km":15},{"name":"Axe Hargeisa–Berbera","lat":9.8,"lon":44.35,"km":10},{"name":"Axe Hargeisa–Berbera","lat":10.05,"lon":44.65,"km":10},{"name":"Axe Hargeisa–Berbera","lat":10.25,"lon":44.85,"km":10},{"name":"Berbera","lat":10.44,"lon":45.01,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/somalie/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"CG","level":"orange","label":"Frontière avec la Centrafrique (bande de 30 km)","match":{"borderKm":30,"with":"CF"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/congo/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CG","level":"orange","label":"Frontière avec le Cabinda (Angola) (bande de 10 km)","match":{"borderKm":10,"with":"AO"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/congo/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CG","level":"orange","label":"Frontière sud avec la RDC (bande de 10 km ; Brazzaville et fleuve au nord exclus)","match":{"borderKm":10,"with":"CD"},"except":{"regions":["Brazzaville","Plateaux","Cuvette","Likouala","Sangha"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/congo/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"CD","level":"orange","label":"Tout le pays (hors zones rouges)","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/republique-democratique-du-congo/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"CD","level":"red","label":"Est du pays : Nord-Kivu, Sud-Kivu, Ituri, Haut-Uele, Tanganyika","match":{"regions":["North Kivu","South Kivu","Ituri","Haut-Uele","Tanganyika"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/republique-democratique-du-congo/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"CD","level":"red","label":"Provinces du Kwilu et du Kwango","match":{"regions":["Kwilu","Kwango"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/republique-democratique-du-congo/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"CD","level":"red","label":"Territoire de Kwamouth (Mai-Ndombe), Bandundu, plateaux des Bateke et parc de Bombo-Lumene (approximation par cercles)","match":{"near":[{"name":"Kwamouth","lat":-3.18,"lon":16.19,"km":70},{"name":"Bandundu","lat":-3.32,"lon":17.38,"km":20},{"name":"Plateaux Bateke / Bombo-Lumene","lat":-4.42,"lon":16.22,"km":50}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/republique-democratique-du-congo/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"UA","level":"red","label":"Ukraine : tout le pays (guerre en cours)","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ukraine/conseils-aux-voyageurs-securite","date":"2026-03-13"},
      {"country":"BY","level":"red","label":"Biélorussie : tout le pays","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/bielorussie/conseils-aux-voyageurs-securite","date":"2026-05-27"},
      {"country":"RU","level":"red","label":"Russie : tout le pays","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/russie/conseils-aux-voyageurs-securite","date":"2026-03-12"},
      {"country":"MD","level":"orange","label":"Transnistrie (rive gauche du Dniestr et Bender)","match":{"regions":["Camenca Tr.","Ribnita Tr.","Dubasari Tr.","Grigoriopol Tr.","Slobozia Tr.","Tiraspol Tr.","Bender Tr."]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/moldavie/conseils-aux-voyageurs-securite","date":"2026-03-11"},
      {"country":"GE","level":"red","label":"Abkhazie et abords (approximation par cercles)","match":{"near":[{"name":"Gagra","lat":43.33,"lon":40.27,"km":25},{"name":"Haute vallée de la Bzyb","lat":43.45,"lon":40.55,"km":20},{"name":"Goudaouta","lat":43.1,"lon":40.62,"km":22},{"name":"Soukhoumi","lat":43,"lon":41.02,"km":25},{"name":"Abkhazie centre","lat":43.25,"lon":41.05,"km":25},{"name":"Haute Kodori ouest","lat":43.2,"lon":41.45,"km":22},{"name":"Haute Kodori est","lat":43.1,"lon":41.85,"km":22},{"name":"Otchamtchire","lat":42.71,"lon":41.46,"km":20},{"name":"Tkvartcheli","lat":42.85,"lon":41.68,"km":18},{"name":"Gali","lat":42.63,"lon":41.73,"km":12},{"name":"Basse Ingouri","lat":42.52,"lon":41.6,"km":9}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/georgie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"GE","level":"red","label":"Ossétie du Sud (région de Tskhinvali) et abords (approximation par cercles)","match":{"near":[{"name":"Tskhinvali","lat":42.23,"lon":43.96,"km":14},{"name":"Java","lat":42.4,"lon":43.93,"km":15},{"name":"Kvaisa","lat":42.51,"lon":43.66,"km":12},{"name":"Znaouri","lat":42.37,"lon":43.73,"km":10},{"name":"Ossétie du Sud nord-est","lat":42.53,"lon":44.12,"km":12},{"name":"Akhalgori","lat":42.13,"lon":44.48,"km":12},{"name":"Ossétie du Sud est","lat":42.3,"lon":44.25,"km":12}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/georgie/conseils-aux-voyageurs-securite","date":"2026-03-05"},
      {"country":"AM","level":"orange","label":"Province du Syunik (Goris, Kapan, Sissian, Meghri)","match":{"cpPrefix":["32","33","34","35"]},"except":{"near":[{"name":"Yeghvard (code postal 3313 erroné dans les données)","lat":40.323,"lon":44.484,"km":3}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/armenie/conseils-aux-voyageurs-securite","date":"2026-03-04"},
      {"country":"AM","level":"red","label":"Zones frontalières avec l'Azerbaïdjan (bande ~12 km)","match":{"borderKm":12,"with":"AZ"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/armenie/conseils-aux-voyageurs-securite","date":"2026-03-04"},
      {"country":"AM","level":"red","label":"Zones frontalières avec le Nakhitchevan (bande ~9 km)","match":{"near":[{"name":"Frontière Nakhitchevan 1","lat":39.78,"lon":44.78,"km":9},{"name":"Frontière Nakhitchevan 2","lat":39.75,"lon":44.89,"km":9},{"name":"Frontière Nakhitchevan 3","lat":39.72,"lon":45,"km":9},{"name":"Frontière Nakhitchevan 4","lat":39.67,"lon":45.09,"km":9},{"name":"Frontière Nakhitchevan 5","lat":39.62,"lon":45.18,"km":9},{"name":"Frontière Nakhitchevan 6","lat":39.58,"lon":45.28,"km":9},{"name":"Frontière Nakhitchevan 7","lat":39.54,"lon":45.38,"km":9},{"name":"Frontière Nakhitchevan 8","lat":39.51,"lon":45.453,"km":9},{"name":"Frontière Nakhitchevan 9","lat":39.48,"lon":45.527,"km":9},{"name":"Frontière Nakhitchevan 10","lat":39.45,"lon":45.6,"km":9},{"name":"Frontière Nakhitchevan 11","lat":39.417,"lon":45.667,"km":9},{"name":"Frontière Nakhitchevan 12","lat":39.383,"lon":45.733,"km":9},{"name":"Frontière Nakhitchevan 13","lat":39.35,"lon":45.8,"km":9},{"name":"Frontière Nakhitchevan 14","lat":39.3,"lon":45.875,"km":9},{"name":"Frontière Nakhitchevan 15","lat":39.25,"lon":45.95,"km":9},{"name":"Frontière Nakhitchevan 16","lat":39.175,"lon":45.985,"km":9},{"name":"Frontière Nakhitchevan 17","lat":39.1,"lon":46.02,"km":9},{"name":"Frontière Nakhitchevan 18","lat":39.04,"lon":46.045,"km":9},{"name":"Frontière Nakhitchevan 19","lat":38.98,"lon":46.07,"km":9},{"name":"Frontière Nakhitchevan 20","lat":38.925,"lon":46.105,"km":9},{"name":"Frontière Nakhitchevan 21","lat":38.87,"lon":46.14,"km":9}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/armenie/conseils-aux-voyageurs-securite","date":"2026-03-04"},
      {"country":"AZ","level":"orange","label":"Azerbaïdjan : majeure partie du territoire (dont Bakou)","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/azerbaidjan/conseils-aux-voyageurs-securite","date":"2026-03-06"},
      {"country":"AZ","level":"red","label":"Ancien Haut-Karabagh et anciens districts adjacents","match":{"regions":["Xankəndi","Xocali","Xocavənd","Şuşa","Kəlbəcər","Laçin","Qubadli","Zəngilan","Ağdam","Füzuli"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/azerbaidjan/conseils-aux-voyageurs-securite","date":"2026-03-06"},
      {"country":"AZ","level":"red","label":"Ancien Haut-Karabagh : secteurs de Djebraïl et d'Ağdərə","match":{"near":[{"name":"Cəbrayıl","lat":39.4,"lon":47.03,"km":18},{"name":"Ağdərə (Martakert)","lat":40.21,"lon":46.82,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/azerbaidjan/conseils-aux-voyageurs-securite","date":"2026-03-06"},
      {"country":"AZ","level":"red","label":"Zones frontalières avec l'Arménie (bande ~15 km)","match":{"borderKm":15,"with":"AM"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/azerbaidjan/conseils-aux-voyageurs-securite","date":"2026-03-06"},
      {"country":"TR","level":"orange","label":"Départements du Hatay, Kilis, Gaziantep, Şanlıurfa, Mardin, Diyarbakır et Batman","match":{"cpPrefix":["31","79","27","63","47","21","72"]},"except":{"near":[{"name":"Antalya (code postal 27500 erroné dans les données)","lat":36.908,"lon":30.696,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/conseils-aux-voyageurs-securite","date":"2026-03-23"},
      {"country":"TR","level":"red","label":"Abords immédiats de la frontière syrienne (bande ~12 km)","match":{"near":[{"name":"Frontière syrienne 1","lat":35.92,"lon":35.92,"km":12},{"name":"Frontière syrienne 2","lat":35.87,"lon":36.035,"km":12},{"name":"Frontière syrienne 3","lat":35.82,"lon":36.15,"km":12},{"name":"Frontière syrienne 4","lat":35.91,"lon":36.26,"km":12},{"name":"Frontière syrienne 5","lat":36,"lon":36.37,"km":12},{"name":"Frontière syrienne 6","lat":36.1,"lon":36.465,"km":12},{"name":"Frontière syrienne 7","lat":36.2,"lon":36.56,"km":12},{"name":"Frontière syrienne 8","lat":36.325,"lon":36.565,"km":12},{"name":"Frontière syrienne 9","lat":36.45,"lon":36.57,"km":12},{"name":"Frontière syrienne 10","lat":36.55,"lon":36.6,"km":12},{"name":"Frontière syrienne 11","lat":36.65,"lon":36.63,"km":12},{"name":"Frontière syrienne 12","lat":36.735,"lon":36.655,"km":12},{"name":"Frontière syrienne 13","lat":36.82,"lon":36.68,"km":12},{"name":"Frontière syrienne 14","lat":36.76,"lon":36.815,"km":12},{"name":"Frontière syrienne 15","lat":36.7,"lon":36.95,"km":12},{"name":"Frontière syrienne 16","lat":36.64,"lon":37.1,"km":12},{"name":"Frontière syrienne 17","lat":36.647,"lon":37.233,"km":12},{"name":"Frontière syrienne 18","lat":36.653,"lon":37.367,"km":12},{"name":"Frontière syrienne 19","lat":36.66,"lon":37.5,"km":12},{"name":"Frontière syrienne 20","lat":36.703,"lon":37.625,"km":12},{"name":"Frontière syrienne 21","lat":36.745,"lon":37.75,"km":12},{"name":"Frontière syrienne 22","lat":36.787,"lon":37.875,"km":12},{"name":"Frontière syrienne 23","lat":36.83,"lon":38,"km":12},{"name":"Frontière syrienne 24","lat":36.847,"lon":38.133,"km":12},{"name":"Frontière syrienne 25","lat":36.863,"lon":38.267,"km":12},{"name":"Frontière syrienne 26","lat":36.88,"lon":38.4,"km":12},{"name":"Frontière syrienne 27","lat":36.835,"lon":38.538,"km":12},{"name":"Frontière syrienne 28","lat":36.79,"lon":38.675,"km":12},{"name":"Frontière syrienne 29","lat":36.745,"lon":38.813,"km":12},{"name":"Frontière syrienne 30","lat":36.7,"lon":38.95,"km":12},{"name":"Frontière syrienne 31","lat":36.725,"lon":39.113,"km":12},{"name":"Frontière syrienne 32","lat":36.75,"lon":39.275,"km":12},{"name":"Frontière syrienne 33","lat":36.775,"lon":39.438,"km":12},{"name":"Frontière syrienne 34","lat":36.8,"lon":39.6,"km":12},{"name":"Frontière syrienne 35","lat":36.817,"lon":39.757,"km":12},{"name":"Frontière syrienne 36","lat":36.833,"lon":39.913,"km":12},{"name":"Frontière syrienne 37","lat":36.85,"lon":40.07,"km":12},{"name":"Frontière syrienne 38","lat":36.888,"lon":40.203,"km":12},{"name":"Frontière syrienne 39","lat":36.925,"lon":40.335,"km":12},{"name":"Frontière syrienne 40","lat":36.962,"lon":40.468,"km":12},{"name":"Frontière syrienne 41","lat":37,"lon":40.6,"km":12},{"name":"Frontière syrienne 42","lat":37.017,"lon":40.75,"km":12},{"name":"Frontière syrienne 43","lat":37.035,"lon":40.9,"km":12},{"name":"Frontière syrienne 44","lat":37.053,"lon":41.05,"km":12},{"name":"Frontière syrienne 45","lat":37.07,"lon":41.2,"km":12},{"name":"Frontière syrienne 46","lat":37.078,"lon":41.35,"km":12},{"name":"Frontière syrienne 47","lat":37.085,"lon":41.5,"km":12},{"name":"Frontière syrienne 48","lat":37.093,"lon":41.65,"km":12},{"name":"Frontière syrienne 49","lat":37.1,"lon":41.8,"km":12},{"name":"Frontière syrienne 50","lat":37.105,"lon":41.938,"km":12},{"name":"Frontière syrienne 51","lat":37.11,"lon":42.075,"km":12},{"name":"Frontière syrienne 52","lat":37.115,"lon":42.212,"km":12},{"name":"Frontière syrienne 53","lat":37.12,"lon":42.35,"km":12}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/conseils-aux-voyageurs-securite","date":"2026-03-23"},
      {"country":"TR","level":"red","label":"Hatay frontalier (Reyhanlı, Kırıkhan, Altınözü, Yayladağı)","match":{"near":[{"name":"Reyhanlı","lat":36.27,"lon":36.57,"km":12},{"name":"Kırıkhan","lat":36.5,"lon":36.36,"km":10},{"name":"Altınözü","lat":36.12,"lon":36.25,"km":10},{"name":"Yayladağı","lat":35.9,"lon":36.06,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/conseils-aux-voyageurs-securite","date":"2026-03-23"},
      {"country":"TR","level":"red","label":"Frontière irakienne : provinces de Şırnak, Hakkari et Siirt","match":{"cpPrefix":["73","30","56"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/conseils-aux-voyageurs-securite","date":"2026-03-23"},
      {"country":"IR","level":"red","label":"Tout le pays","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/iran/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"YE","level":"red","label":"Tout le pays (y compris Socotra et les îles)","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/yemen/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BH","level":"orange","label":"Tout le pays (situation régionale)","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/bahrein/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KW","level":"orange","label":"Tout le pays (situation régionale)","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/koweit/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KW","level":"red","label":"Bande de 5 km le long de la frontière irakienne (hors Abdali Farms)","match":{"borderKm":5,"with":"IQ"},"except":{"near":[{"name":"Abdali Farms","lat":30.04,"lon":47.72,"km":4}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/koweit/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KW","level":"red","label":"Îles de Warbah et de Boubiyan","match":{"near":[{"name":"Île de Boubiyan","lat":29.85,"lon":48.22,"km":17},{"name":"Île de Warbah","lat":29.97,"lon":48.06,"km":5}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/koweit/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"AE","level":"red","label":"Îles d'Abou Moussa, Grande Tomb et Petite Tomb (et 15 km alentour)","match":{"near":[{"name":"Abou Moussa","lat":25.87,"lon":55.03,"km":15},{"name":"Grande Tomb","lat":26.26,"lon":55.31,"km":15},{"name":"Petite Tomb","lat":26.24,"lon":55.15,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/emirats-arabes-unis/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"OM","level":"orange","label":"Presqu'île de Moussandam","match":{"regions":["Musandam Governorate"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/oman/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"OM","level":"orange","label":"Presqu'île de Moussandam","match":{"near":[{"name":"Moussandam (Khasab)","lat":26.1,"lon":56.25,"km":45},{"name":"Madha","lat":25.28,"lon":56.33,"km":6}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/oman/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"OM","level":"orange","label":"Zone frontalière du Yémen","match":{"borderKm":25,"with":"YE"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/oman/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"OM","level":"orange","label":"Frange côtière du Dhofar et d'Al Wusta, de Salalah à Douqm (approximation par cercles)","match":{"near":[{"name":"Dhalkut","lat":16.72,"lon":53.25,"km":22},{"name":"Rakhyut","lat":16.78,"lon":53.5,"km":22},{"name":"Mughsayl","lat":16.88,"lon":53.8,"km":25},{"name":"Salalah","lat":17.02,"lon":54.09,"km":32},{"name":"Taqah","lat":17.05,"lon":54.4,"km":25},{"name":"Mirbat","lat":17,"lon":54.69,"km":22},{"name":"Sadah","lat":17.05,"lon":55.07,"km":22},{"name":"Hasik","lat":17.45,"lon":55.27,"km":22},{"name":"Shuwaymiyah","lat":17.88,"lon":55.6,"km":22},{"name":"Côte (Shuwaymiyah-Sharbithat)","lat":17.9,"lon":55.95,"km":20},{"name":"Sharbithat","lat":17.93,"lon":56.27,"km":20},{"name":"Côte (Sawqrah)","lat":18.16,"lon":56.55,"km":20},{"name":"Côte (Sawqrah-Madrakah)","lat":18.45,"lon":56.95,"km":22},{"name":"Côte (Sawqrah-Madrakah)","lat":18.75,"lon":57.35,"km":22},{"name":"Ras Madrakah","lat":18.98,"lon":57.75,"km":22},{"name":"Côte (Madrakah-Douqm)","lat":19.32,"lon":57.72,"km":20},{"name":"Douqm","lat":19.66,"lon":57.7,"km":25}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/oman/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SA","level":"red","label":"Zone frontalière du Yémen (≈100 km de profondeur)","match":{"borderKm":100,"with":"YE"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/arabie-saoudite/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SA","level":"red","label":"Zone frontalière du Yémen à l'est de Najran (Charourah, Al Wadiah, Kharkhir)","match":{"near":[{"name":"Bande frontalière Yémen (Rub al-Khali)","lat":17.6,"lon":45.5,"km":80},{"name":"Bande frontalière Yémen (Rub al-Khali)","lat":17.6,"lon":46.5,"km":80},{"name":"Bande frontalière Yémen (Rub al-Khali)","lat":17.7,"lon":47.5,"km":80},{"name":"Bande frontalière Yémen (Rub al-Khali)","lat":18.1,"lon":48.5,"km":80},{"name":"Bande frontalière Yémen (Rub al-Khali)","lat":18.4,"lon":49.5,"km":80},{"name":"Bande frontalière Yémen (Rub al-Khali)","lat":18.8,"lon":50.5,"km":80},{"name":"Bande frontalière Yémen (Rub al-Khali)","lat":19,"lon":51.5,"km":80}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/arabie-saoudite/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SA","level":"red","label":"Région de Jazan","match":{"regions":["Jazan Region"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/arabie-saoudite/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SA","level":"red","label":"Abha et Khamis Mouchaït","match":{"near":[{"name":"Abha","lat":18.22,"lon":42.51,"km":20},{"name":"Khamis Mouchaït","lat":18.3,"lon":42.73,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/arabie-saoudite/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SA","level":"orange","label":"Qatif et Mouawiya (Al Awamiyah)","match":{"near":[{"name":"Qatif","lat":26.56,"lon":50.01,"km":6},{"name":"Al Awamiyah","lat":26.59,"lon":49.99,"km":4}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/arabie-saoudite/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SA","level":"orange","label":"Région d'Al Qassim (dont Bouraïdah)","match":{"regions":["Al-Qassim Region"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/arabie-saoudite/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SA","level":"orange","label":"Zone frontalière de l'Irak (bande d'environ 100 km, tracé approché de la carte)","match":{"near":[{"name":"Bande frontalière Irak","lat":31.6,"lon":39.6,"km":50},{"name":"Bande frontalière Irak","lat":31.3,"lon":40.3,"km":50},{"name":"Bande frontalière Irak","lat":30.95,"lon":41,"km":50},{"name":"Bande frontalière Irak","lat":30.6,"lon":41.7,"km":50},{"name":"Bande frontalière Irak","lat":30.2,"lon":42.4,"km":50},{"name":"Bande frontalière Irak","lat":29.85,"lon":43.1,"km":50},{"name":"Bande frontalière Irak","lat":29.5,"lon":43.7,"km":50},{"name":"Bande frontalière Irak","lat":29.25,"lon":44.3,"km":50},{"name":"Bande frontalière Irak","lat":29.05,"lon":44.9,"km":50},{"name":"Bande frontalière Irak","lat":28.95,"lon":45.5,"km":50},{"name":"Bande frontalière Irak","lat":29,"lon":46.1,"km":50}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/arabie-saoudite/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"red","label":"Gouvernorats de Salah ad-Din, Kirkouk et Diyala","match":{"regions":["Salah ad Din","Kirkuk","Diyala"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"red","label":"Gouvernorat d'Al-Anbar (hors Ramadi, Fallouja et axe vers Bagdad)","match":{"regions":["Anbar"]},"except":{"near":[{"name":"Ramadi","lat":33.42,"lon":43.3,"km":10},{"name":"Axe Ramadi-Fallouja (Khalidiya)","lat":33.38,"lon":43.55,"km":8},{"name":"Fallouja","lat":33.35,"lon":43.78,"km":9},{"name":"Axe Fallouja-Bagdad","lat":33.32,"lon":43.97,"km":8},{"name":"Axe Fallouja-Bagdad (Abou Ghraib)","lat":33.3,"lon":44.12,"km":7}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"red","label":"Ninive (hors Mossoul, route Mossoul-Erbil, Hamdaniya/Baachiqa) et Kurdistan hors corridor Zakho-Dohouk-Erbil-Souleymanié-Halabja","match":{"regions":["Nineveh","Duhok","Erbil","Sulaymaniyah","Halabja"]},"except":{"near":[{"name":"Mossoul","lat":36.34,"lon":43.13,"km":12},{"name":"Bartella","lat":36.35,"lon":43.38,"km":7},{"name":"Qaraqosh (Hamdaniya)","lat":36.27,"lon":43.38,"km":9},{"name":"Bashiqa","lat":36.45,"lon":43.35,"km":7},{"name":"Route Mossoul-Erbil (Khazir)","lat":36.3,"lon":43.6,"km":8},{"name":"Route Mossoul-Erbil (Kalak)","lat":36.26,"lon":43.8,"km":8},{"name":"Zakho","lat":37.15,"lon":42.69,"km":8},{"name":"Dohuk","lat":36.87,"lon":42.99,"km":10},{"name":"Amedi","lat":37.09,"lon":43.49,"km":5},{"name":"Route Dohuk-Amedi (Sarsang)","lat":37.05,"lon":43.33,"km":6},{"name":"Route Dohuk-Amedi","lat":36.97,"lon":43.16,"km":6},{"name":"Akre","lat":36.74,"lon":43.88,"km":8},{"name":"Barzan","lat":36.92,"lon":44.05,"km":6},{"name":"Soran","lat":36.65,"lon":44.54,"km":8},{"name":"Erbil","lat":36.19,"lon":44.01,"km":15},{"name":"Koya","lat":36.08,"lon":44.63,"km":8},{"name":"Sulaymaniyah","lat":35.56,"lon":45.43,"km":12},{"name":"Halabja","lat":35.18,"lon":45.99,"km":7},{"name":"Corridor KRG","lat":35.14,"lon":45.85,"km":10},{"name":"Corridor KRG","lat":35.14,"lon":46,"km":10},{"name":"Corridor KRG","lat":35.26,"lon":45.62,"km":10},{"name":"Corridor KRG","lat":35.26,"lon":45.77,"km":10},{"name":"Corridor KRG","lat":35.26,"lon":45.92,"km":10},{"name":"Corridor KRG","lat":35.26,"lon":46.07,"km":10},{"name":"Corridor KRG","lat":35.38,"lon":45.55,"km":10},{"name":"Corridor KRG","lat":35.38,"lon":45.7,"km":10},{"name":"Corridor KRG","lat":35.38,"lon":45.85,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.17,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.32,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.47,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.62,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.77,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":44.95,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.1,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.25,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.4,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.55,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.7,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":44.72,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":44.87,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.02,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.17,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.32,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.47,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.62,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.5,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.65,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.8,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.95,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":45.1,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":45.25,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":45.4,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":43.82,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":43.97,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.12,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.27,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.42,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.72,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.87,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":45.02,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":45.17,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":45.32,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":43.6,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.5,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.65,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.8,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.95,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":45.1,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":45.25,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":43.52,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":43.82,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":43.97,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.12,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.27,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.42,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.72,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.87,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":45.02,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.3,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.45,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.6,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.5,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.65,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.8,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.95,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":43.52,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":43.82,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":43.97,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.12,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.27,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.42,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.72,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.87,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":43.45,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":43.6,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.5,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.65,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.22,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.37,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.52,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.82,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.97,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":44.12,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":44.27,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":44.42,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":42.85,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.15,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.3,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.45,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.6,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":42.78,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":42.93,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.08,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.22,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.37,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.52,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":37.06,"lon":42.7,"km":10},{"name":"Corridor KRG","lat":37.06,"lon":42.85,"km":10},{"name":"Corridor KRG","lat":37.18,"lon":42.78,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"red","label":"Irak (lieux sans gouvernorat)","match":{"all":true},"except":{"cpPrefix":["IQ-"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"orange","label":"Gouvernorats de Bagdad, Karbala, Babel, Qadissiya, Najaf, Muthanna, Dhi-Qar, Wasit, Misan et Bassora","match":{"regions":["Karbala","Babil","Al-Qadisiyah","Muthanna","Dhi Qar","Najaf","Basra","Wasit","Maysan","Baghdad"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"orange","label":"Ramadi, Fallouja et axe Ramadi-Fallouja-Bagdad","match":{"near":[{"name":"Ramadi","lat":33.42,"lon":43.3,"km":10},{"name":"Axe Ramadi-Fallouja (Khalidiya)","lat":33.38,"lon":43.55,"km":8},{"name":"Fallouja","lat":33.35,"lon":43.78,"km":9},{"name":"Axe Fallouja-Bagdad","lat":33.32,"lon":43.97,"km":8},{"name":"Axe Fallouja-Bagdad (Abou Ghraib)","lat":33.3,"lon":44.12,"km":7}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"orange","label":"Mossoul, route Mossoul-Erbil et plaine de Ninive (Hamdaniya, Baachiqa)","match":{"near":[{"name":"Mossoul","lat":36.34,"lon":43.13,"km":12},{"name":"Bartella","lat":36.35,"lon":43.38,"km":7},{"name":"Qaraqosh (Hamdaniya)","lat":36.27,"lon":43.38,"km":9},{"name":"Bashiqa","lat":36.45,"lon":43.35,"km":7},{"name":"Route Mossoul-Erbil (Khazir)","lat":36.3,"lon":43.6,"km":8},{"name":"Route Mossoul-Erbil (Kalak)","lat":36.26,"lon":43.8,"km":8}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"orange","label":"Kurdistan : corridor Zakho-Dohouk-Erbil-Koya-Souleymanié-Halabja, Akre, Barzan, Soran, Amedi (tracé approché de la carte)","match":{"near":[{"name":"Zakho","lat":37.15,"lon":42.69,"km":8},{"name":"Dohuk","lat":36.87,"lon":42.99,"km":10},{"name":"Amedi","lat":37.09,"lon":43.49,"km":5},{"name":"Route Dohuk-Amedi (Sarsang)","lat":37.05,"lon":43.33,"km":6},{"name":"Route Dohuk-Amedi","lat":36.97,"lon":43.16,"km":6},{"name":"Akre","lat":36.74,"lon":43.88,"km":8},{"name":"Barzan","lat":36.92,"lon":44.05,"km":6},{"name":"Soran","lat":36.65,"lon":44.54,"km":8},{"name":"Erbil","lat":36.19,"lon":44.01,"km":15},{"name":"Koya","lat":36.08,"lon":44.63,"km":8},{"name":"Sulaymaniyah","lat":35.56,"lon":45.43,"km":12},{"name":"Halabja","lat":35.18,"lon":45.99,"km":7},{"name":"Corridor KRG","lat":35.14,"lon":45.85,"km":10},{"name":"Corridor KRG","lat":35.14,"lon":46,"km":10},{"name":"Corridor KRG","lat":35.26,"lon":45.62,"km":10},{"name":"Corridor KRG","lat":35.26,"lon":45.77,"km":10},{"name":"Corridor KRG","lat":35.26,"lon":45.92,"km":10},{"name":"Corridor KRG","lat":35.26,"lon":46.07,"km":10},{"name":"Corridor KRG","lat":35.38,"lon":45.55,"km":10},{"name":"Corridor KRG","lat":35.38,"lon":45.7,"km":10},{"name":"Corridor KRG","lat":35.38,"lon":45.85,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.17,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.32,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.47,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.62,"km":10},{"name":"Corridor KRG","lat":35.5,"lon":45.77,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":44.95,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.1,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.25,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.4,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.55,"km":10},{"name":"Corridor KRG","lat":35.62,"lon":45.7,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":44.72,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":44.87,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.02,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.17,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.32,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.47,"km":10},{"name":"Corridor KRG","lat":35.74,"lon":45.62,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.5,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.65,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.8,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":44.95,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":45.1,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":45.25,"km":10},{"name":"Corridor KRG","lat":35.86,"lon":45.4,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":43.82,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":43.97,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.12,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.27,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.42,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.72,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":44.87,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":45.02,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":45.17,"km":10},{"name":"Corridor KRG","lat":35.98,"lon":45.32,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":43.6,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.5,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.65,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.8,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":44.95,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":45.1,"km":10},{"name":"Corridor KRG","lat":36.1,"lon":45.25,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":43.52,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":43.82,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":43.97,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.12,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.27,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.42,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.72,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":44.87,"km":10},{"name":"Corridor KRG","lat":36.22,"lon":45.02,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.3,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.45,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.6,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.5,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.65,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.8,"km":10},{"name":"Corridor KRG","lat":36.34,"lon":44.95,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":43.52,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":43.82,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":43.97,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.12,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.27,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.42,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.72,"km":10},{"name":"Corridor KRG","lat":36.46,"lon":44.87,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":43.45,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":43.6,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.5,"km":10},{"name":"Corridor KRG","lat":36.58,"lon":44.65,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.22,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.37,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.52,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.82,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":43.97,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":44.12,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":44.27,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":44.42,"km":10},{"name":"Corridor KRG","lat":36.7,"lon":44.57,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":42.85,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.15,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.3,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.45,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.6,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.75,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":43.9,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":44.05,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":44.2,"km":10},{"name":"Corridor KRG","lat":36.82,"lon":44.35,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":42.78,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":42.93,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.08,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.22,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.37,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.52,"km":10},{"name":"Corridor KRG","lat":36.94,"lon":43.67,"km":10},{"name":"Corridor KRG","lat":37.06,"lon":42.7,"km":10},{"name":"Corridor KRG","lat":37.06,"lon":42.85,"km":10},{"name":"Corridor KRG","lat":37.18,"lon":42.78,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"red","label":"Moins de 20 km de la frontière iranienne (hors Soran, Halabja, Bassora)","match":{"borderKm":20,"with":"IR"},"except":{"near":[{"name":"Bassora (ville)","lat":30.51,"lon":47.8,"km":10},{"name":"Umm Qasr / Khor al-Zubair","lat":30.1,"lon":47.95,"km":12},{"name":"Soran","lat":36.65,"lon":44.54,"km":8},{"name":"Halabja","lat":35.18,"lon":45.99,"km":7}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"red","label":"Zones montagneuses le long de la frontière turque (moins de 15 km, hors Zakho et Amedi)","match":{"borderKm":15,"with":"TR"},"except":{"near":[{"name":"Zakho","lat":37.15,"lon":42.69,"km":8},{"name":"Amedi","lat":37.09,"lon":43.49,"km":5}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"red","label":"Quartiers périphériques et nord de Bagdad (Sadr City, Bayaa, Za'faraniya, Taji, Tarmiyah)","match":{"near":[{"name":"Sadr City","lat":33.39,"lon":44.46,"km":5},{"name":"Bayaa","lat":33.27,"lon":44.34,"km":3},{"name":"Za'faraniya","lat":33.25,"lon":44.5,"km":4},{"name":"Taji","lat":33.52,"lon":44.27,"km":12},{"name":"Tarmiyah","lat":33.67,"lon":44.4,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"red","label":"Babel à l'ouest de l'axe Bagdad-Iskandariya-Kerbala (Jurf al-Sakhar)","match":{"near":[{"name":"Jurf al-Sakhar","lat":32.87,"lon":44.15,"km":13}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IQ","level":"red","label":"Désert de Najaf et du Muthanna à la frontière saoudienne","match":{"near":[{"name":"Désert de Najaf (Nukhayb)","lat":30.75,"lon":43.4,"km":80},{"name":"Désert de Najaf (sud)","lat":31.25,"lon":44,"km":30},{"name":"Désert du Muthanna (As Salman)","lat":30.3,"lon":44.6,"km":60},{"name":"Désert du Muthanna (Busayyah)","lat":29.9,"lon":46,"km":60},{"name":"Désert du Muthanna (sud)","lat":29.1,"lon":46.4,"km":30}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/irak/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SY","level":"red","label":"Tout le pays","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/syrie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"LB","level":"red","label":"Akkar (nord de la route Abdeh–Mechmech), plaine de la Béqaa (Baalbek, Anjar, Zahlé), Nabatieh","match":{"all":true},"except":{"cpPrefix":["LB-BA","LB-JL","LB-AS","LB-JA"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/liban/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"LB","level":"red","label":"Sud-Liban au sud de Saïda (axe Saïda–Jezzine–Machghara, Tyr, Naqoura)","match":{"cpPrefix":["LB-JA"]},"except":{"near":[{"name":"Saïda","lat":33.5575,"lon":35.3715,"km":3}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/liban/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"LB","level":"orange","label":"Centre du pays de Tripoli à Saïda (Beyrouth, Mont-Liban, Liban-Nord)","match":{"cpPrefix":["LB-BA","LB-JL","LB-AS"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/liban/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"LB","level":"orange","label":"Ville de Saïda","match":{"near":[{"name":"Saïda","lat":33.5575,"lon":35.3715,"km":3}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/liban/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IL","level":"orange","label":"Israël (ensemble du pays)","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/israel-palestine/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IL","level":"red","label":"Frontière avec le Liban","match":{"borderKm":8,"with":"LB"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/israel-palestine/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IL","level":"red","label":"Plateau du Golan","match":{"near":[{"name":"Golan nord (Majdal Shams / Mas’ade)","lat":33.15,"lon":35.8,"km":12},{"name":"Golan sud (Katzrin / Hispin)","lat":32.9,"lon":35.78,"km":14}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/israel-palestine/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"IL","level":"red","label":"Zone autour de la bande de Gaza","match":{"near":[{"name":"Sderot","lat":31.525,"lon":34.597,"km":7},{"name":"Be’eri / Nahal Oz","lat":31.44,"lon":34.49,"km":7},{"name":"Kissufim / Nir Oz","lat":31.33,"lon":34.4,"km":8},{"name":"Kerem Shalom","lat":31.23,"lon":34.29,"km":8}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/israel-palestine/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"PS","level":"red","label":"Bande de Gaza","match":{"cpPrefix":["PS-GZA"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/israel-palestine/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"PS","level":"orange","label":"Cisjordanie (y compris Jérusalem-Est)","match":{"cpPrefix":["PS-WBK"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/israel-palestine/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"JO","level":"red","label":"Frontière avec la Syrie","match":{"borderKm":12,"with":"SY"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/jordanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"JO","level":"red","label":"Frontière avec l'Irak (secteur Rukban / Ruwaished-Est)","match":{"near":[{"name":"Rukban (confins Syrie–Irak)","lat":33.31,"lon":38.7,"km":30}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/jordanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"JO","level":"orange","label":"Bande de territoire aux abords de la frontière syrienne (Ramtha, Irbid…)","match":{"borderKm":30,"with":"SY"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/jordanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"JO","level":"orange","label":"Nord-est du pays (gouvernorat de Mafraq)","match":{"cpPrefix":["JO-MA"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/jordanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"JO","level":"orange","label":"Zone frontalière avec les territoires palestiniens (vallée du Jourdain)","match":{"borderKm":15,"with":"PS"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/jordanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"JO","level":"orange","label":"Aqaba et ses environs ; ville de Ma'an","match":{"near":[{"name":"Aqaba","lat":29.53,"lon":35.01,"km":25},{"name":"Ma'an","lat":30.196,"lon":35.734,"km":8}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/jordanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"EG","level":"red","label":"Nord du Sinaï (au nord de la ligne Suez–Taba)","match":{"cpPrefix":["EG-SIN"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/egypte/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"EG","level":"red","label":"Désert occidental vers la frontière libyenne (Salloum)","match":{"borderKm":40,"with":"LY"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/egypte/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"EG","level":"red","label":"Zone frontalière avec le Soudan (route au sud d'Abou Simbel)","match":{"borderKm":30,"with":"SD"},"except":{"near":[{"name":"Abou Simbel","lat":22.3457,"lon":31.6162,"km":5}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/egypte/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"EG","level":"red","label":"Triangle de Halayeb (frontière soudanaise)","match":{"near":[{"name":"Hala'ib","lat":22.2227,"lon":36.6468,"km":40}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/egypte/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"EG","level":"orange","label":"Désert à l'ouest de Marsa Matrouh (Sidi Barrani, oasis de Siwa)","match":{"borderKm":170,"with":"LY"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/egypte/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"EG","level":"orange","label":"Oasis de Dakhla (hors triangle Le Caire–Farafra–El Kharga, approximation)","match":{"near":[{"name":"Mout (Dakhla)","lat":25.4874,"lon":28.9792,"km":40}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/egypte/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"LY","level":"red","label":"Tout le pays, y compris Tripoli (sauf Benghazi et Misrata)","match":{"all":true},"except":{"near":[{"name":"Benghazi","lat":32.115,"lon":20.07,"km":20},{"name":"Misrata","lat":32.375,"lon":15.09,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/libye/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"LY","level":"orange","label":"Villes de Benghazi et Misrata","match":{"near":[{"name":"Benghazi","lat":32.115,"lon":20.07,"km":20},{"name":"Misrata","lat":32.375,"lon":15.09,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/libye/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TN","level":"red","label":"Monts Chambi, Semmama, Selloum, Mghila et Orbata","match":{"near":[{"name":"Mont Chambi","lat":35.2,"lon":8.67,"km":8},{"name":"Mont Semmama","lat":35.31,"lon":8.93,"km":6},{"name":"Mont Selloum","lat":35.08,"lon":8.73,"km":6},{"name":"Mont Mghila","lat":35.4,"lon":9.25,"km":7},{"name":"Mont Orbata","lat":34.36,"lon":9.05,"km":7}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tunisie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TN","level":"red","label":"Zone militaire saharienne proche des frontières libyenne et algérienne (Dehiba, poste frontière)","match":{"near":[{"name":"Dehiba (frontière libyenne)","lat":32.008,"lon":10.7013,"km":3}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tunisie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TN","level":"orange","label":"Désert au sud et à l'est de la ligne Rjim Maatoug–Borj Bourguiba–Ben Guerdane (Remada, Dehiba, Ksar Ghilane)","match":{"near":[{"name":"Remada","lat":32.3166,"lon":10.3955,"km":25},{"name":"Dehiba","lat":32.008,"lon":10.7013,"km":20},{"name":"Ksar Ghilane","lat":32.9807,"lon":9.6363,"km":15},{"name":"Frontière Ras Jedir (est de Ben Guerdane)","lat":33.14,"lon":11.46,"km":12}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tunisie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TN","level":"orange","label":"Secteur entre les monts Chambi, Semmama et Mghila, sud du mont Selloum, abords du mont Orbata","match":{"near":[{"name":"Entre Chambi, Semmama et Mghila","lat":35.28,"lon":8.95,"km":22},{"name":"Sud du mont Selloum","lat":34.98,"lon":8.72,"km":12},{"name":"Abords du mont Orbata","lat":34.36,"lon":9.05,"km":18}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tunisie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TN","level":"orange","label":"Moins de 5 km de la frontière algérienne (Jendouba, Le Kef)","match":{"borderKm":5,"with":"DZ"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tunisie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"DZ","level":"red","label":"Frontière tunisienne à partir et au sud de Tébessa","match":{"borderKm":60,"with":"TN"},"except":{"near":[{"name":"Nord de Tébessa (Ouenza, Souk Ahras, El Tarf)","lat":36.3,"lon":8.1,"km":95}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/algerie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"DZ","level":"red","label":"Frontière libyenne (In Amenas)","match":{"near":[{"name":"In Amenas / Zarzaïtine","lat":28.06,"lon":9.65,"km":60}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/algerie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"DZ","level":"red","label":"Frontière marocaine","match":{"borderKm":20,"with":"MA"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/algerie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"DZ","level":"orange","label":"Abords de la frontière marocaine","match":{"borderKm":35,"with":"MA"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/algerie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"DZ","level":"orange","label":"Wilayas d'Aïn Defla, Batna, Sétif et de Tindouf","match":{"regions":["Ain-Defla","Batna","Setif","Tindouf"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/algerie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"DZ","level":"orange","label":"Massif des Aurès, massif de Chréa, région de Hassi Messaoud","match":{"near":[{"name":"Massif des Aurès","lat":35.25,"lon":6.55,"km":45},{"name":"Massif de Chréa","lat":36.42,"lon":2.88,"km":12},{"name":"Hassi Messaoud","lat":31.68,"lon":6.07,"km":50}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/algerie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MA","level":"red","label":"Le long de la frontière avec la Mauritanie","match":{"borderKm":30,"with":"MR"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/maroc/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"EH","level":"red","label":"Le long de la frontière avec la Mauritanie (hors poste de Guerguerat sur la route côtière)","match":{"borderKm":30,"with":"MR"},"except":{"near":[{"name":"Guerguerat","lat":21.4271,"lon":-16.9599,"km":3}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/maroc/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MR","level":"red","label":"Bande frontalière avec le Mali","match":{"borderKm":50,"with":"ML"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mauritanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MR","level":"red","label":"Hodh Ech Chargui et Hodh El Gharbi (sud-est de la ligne Akreijit–Kankossa, approx. par wilayas)","match":{"regions":["Hodh Ech Chargi","Hodh El Gharbi"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mauritanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MR","level":"red","label":"Nord-est : au nord de Zouérate et au nord-est de la ligne Zouérate–Ghallaouia (approx. : Tiris Zemmour hors Zouérate/F'Dérik)","match":{"regions":["Tiris Zemmour"]},"except":{"near":[{"name":"Zouérate","lat":22.735,"lon":-12.471,"km":25},{"name":"F'Dérik","lat":22.679,"lon":-12.708,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mauritanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MR","level":"orange","label":"Zouérate et F'Dérik (au nord de la ligne Choum–Aghouedir)","match":{"near":[{"name":"Zouérate","lat":22.735,"lon":-12.471,"km":25},{"name":"F'Dérik","lat":22.679,"lon":-12.708,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mauritanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MR","level":"orange","label":"Zone frontalière avec le Sahara occidental de Nouadhibou à Zouérate (hors ville de Nouadhibou)","match":{"borderKm":25,"with":"EH"},"except":{"near":[{"name":"Nouadhibou","lat":20.94,"lon":-17.04,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mauritanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MR","level":"orange","label":"Assaba, Gorgol et Guidimakha (sud-est de la ligne Tichit–Kaédi)","match":{"regions":["Assaba","Gorgol","Guidimaka"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mauritanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MR","level":"orange","label":"Adrar et Tagant à l'est de la ligne Aghouedir–Tichit (approx. : wilayas hors Atar, Chinguetti, Aoujeft, Tidjikja, Moudjéria)","match":{"regions":["Adrar","Tagant"]},"except":{"near":[{"name":"Atar","lat":20.517,"lon":-13.049,"km":50},{"name":"Chinguetti","lat":20.463,"lon":-12.364,"km":25},{"name":"Aoujeft","lat":20.03,"lon":-13.05,"km":25},{"name":"Tidjikja","lat":18.556,"lon":-11.427,"km":50},{"name":"Moudjéria","lat":17.88,"lon":-12.33,"km":40}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mauritanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"ML","level":"red","label":"Ensemble du territoire","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mali/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SN","level":"orange","label":"Zone frontalière avec le Mali","match":{"borderKm":30,"with":"ML"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/senegal/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SN","level":"orange","label":"Frontière avec la Mauritanie dans la région de Matam","match":{"borderKm":20,"with":"MR"},"except":{"regions":["Saint-Louis","Louga","Tambacounda"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/senegal/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SN","level":"orange","label":"Casamance : frontière avec la Gambie (hors axes routiers principaux)","match":{"borderKm":10,"with":"GM"},"except":{"regions":["Fatick","Kaolack","Kaffrine","Tambacounda"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/senegal/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SN","level":"orange","label":"Casamance : bande frontalière avec la Guinée-Bissau au sud de Ziguinchor (hors axe Ziguinchor–frontière)","match":{"borderKm":10,"with":"GW"},"except":{"regions":["Sédhiou","Kolda"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/senegal/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GN","level":"orange","label":"Zone frontalière avec le Mali (dont Siguiri et Mandiana)","match":{"borderKm":50,"with":"ML"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/guinee/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GN","level":"orange","label":"Zone frontalière avec la Côte d'Ivoire (dont réserve naturelle de Kankan)","match":{"borderKm":50,"with":"CI"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/guinee/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GN","level":"orange","label":"Villes de Siguiri et Mandiana","match":{"near":[{"name":"Siguiri","lat":11.42,"lon":-9.17,"km":15},{"name":"Mandiana","lat":10.63,"lon":-8.69,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/guinee/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GW","level":"orange","label":"Zone frontalière avec le Sénégal","match":{"borderKm":20,"with":"SN"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/guinee-bissao/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"SL","level":"orange","label":"Zone frontalière avec le Liberia","match":{"borderKm":25,"with":"LR"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/sierra-leone/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"LR","level":"orange","label":"Zones frontalières avec la Sierra Leone (Grand Cape Mount, Gbarpolu, Lofa)","match":{"borderKm":20,"with":"SL"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/liberia/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"LR","level":"orange","label":"Zones frontalières avec la Côte d'Ivoire (Nimba au sud de Buutuo, Grand Gedeh, River Gee, Maryland)","match":{"borderKm":20,"with":"CI"},"except":{"near":[{"name":"Nimba nord (au nord de Buutuo)","lat":7.25,"lon":-8.45,"km":40}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/liberia/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BF","level":"red","label":"Ensemble du territoire","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/burkina-faso/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"CI","level":"red","label":"Zone frontalière avec le Mali","match":{"borderKm":30,"with":"ML"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cote-d-ivoire/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"CI","level":"red","label":"Zone frontalière avec le Burkina Faso","match":{"borderKm":30,"with":"BF"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cote-d-ivoire/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"CI","level":"red","label":"Nord du Zanzan, est des Savanes et parc national de la Comoé (approx. par cercles)","match":{"near":[{"name":"Parc national de la Comoé","lat":8.8,"lon":-3.8,"km":65},{"name":"Bouna (nord Zanzan)","lat":9.27,"lon":-3,"km":50},{"name":"Kong (est Savanes)","lat":9.15,"lon":-4.61,"km":40},{"name":"Ferkessédougou (est Savanes)","lat":9.59,"lon":-5.19,"km":30}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cote-d-ivoire/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"CI","level":"orange","label":"Zone frontalière avec le Liberia (dont Tabou, Taï, Grabo)","match":{"borderKm":30,"with":"LR"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cote-d-ivoire/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"CI","level":"orange","label":"Villes de Tabou, Taï et Grabo","match":{"near":[{"name":"Tabou","lat":4.42,"lon":-7.35,"km":10},{"name":"Taï","lat":5.87,"lon":-7.45,"km":10},{"name":"Grabo","lat":4.92,"lon":-7.5,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/cote-d-ivoire/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GH","level":"red","label":"Frontière nord avec le Burkina Faso (dont Tumu, Navrongo, Bawku)","match":{"borderKm":25,"with":"BF"},"except":{"regions":["Upper West","Savannah"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ghana/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GH","level":"red","label":"Tumu, Navrongo et Bawku","match":{"near":[{"name":"Tumu","lat":10.88,"lon":-1.98,"km":30},{"name":"Navrongo","lat":10.89,"lon":-1.09,"km":10},{"name":"Bawku","lat":11.06,"lon":-0.24,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ghana/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GH","level":"orange","label":"Frontière ouest avec le Burkina Faso","match":{"borderKm":25,"with":"BF"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ghana/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GH","level":"orange","label":"Parc (réserve) de Gbelé et ses environs","match":{"near":[{"name":"Gbele Resource Reserve","lat":10.52,"lon":-2.22,"km":25}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ghana/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GH","level":"orange","label":"Partie nord-ouest de la frontière avec la Côte d'Ivoire","match":{"borderKm":25,"with":"CI"},"except":{"regions":["Western","Western North","Ahafo"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ghana/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GH","level":"orange","label":"Frontière avec le Togo du nord-est de Gambaga au sud de Chunbawso (bande de 5 à 10 km)","match":{"borderKm":10,"with":"TG"},"except":{"regions":["Upper East","Oti","Volta"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ghana/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"GH","level":"orange","label":"Zone entre Bimbilla et la frontière togolaise (approx. par cercle)","match":{"near":[{"name":"Bimbilla – frontière togolaise","lat":8.95,"lon":0.2,"km":30}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ghana/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TG","level":"red","label":"Zone des triples frontières (Burkina/Togo/Ghana et Burkina/Togo/Bénin), passages de Sinkassé et Mandouri","match":{"near":[{"name":"Triple frontière BF/TG/GH – Sinkassé","lat":11.1,"lon":0,"km":25},{"name":"Triple frontière BF/TG/BJ","lat":11,"lon":0.92,"km":25},{"name":"Mandouri","lat":10.85,"lon":0.82,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/togo/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TG","level":"orange","label":"Région des Savanes (dont Dapaong)","match":{"regions":["Savanes"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/togo/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BJ","level":"red","label":"Zone frontalière du Burkina Faso","match":{"borderKm":30,"with":"BF"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/benin/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BJ","level":"red","label":"Zone frontalière du Niger","match":{"borderKm":30,"with":"NE"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/benin/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BJ","level":"red","label":"Parcs de la Pendjari et du W et zones mitoyennes, Banikoara","match":{"near":[{"name":"Parc national de la Pendjari","lat":11.1,"lon":1.5,"km":45},{"name":"Parc national du W (Bénin)","lat":11.9,"lon":2.6,"km":60},{"name":"Banikoara","lat":11.3,"lon":2.44,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/benin/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BJ","level":"red","label":"Frontière nord-ouest avec le Togo (Atakora)","match":{"borderKm":30,"with":"TG"},"except":{"regions":["Donga","Collines","Plateau","Zou","Kouffo","Mono","Atlantique","Littoral"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/benin/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BJ","level":"red","label":"Frontière nord-est avec le Nigeria jusqu'aux environs de Nikki","match":{"borderKm":30,"with":"NG"},"except":{"regions":["Borgou","Collines","Plateau","Ouémé","Zou","Atlantique","Littoral"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/benin/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BJ","level":"red","label":"Frontière nord-est avec le Nigeria, partie Borgou au nord de Nikki (approx. par cercle)","match":{"near":[{"name":"Kalalé – frontière","lat":10.3,"lon":3.45,"km":35}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/benin/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BJ","level":"orange","label":"Atakora (Tanguiéta, Natitingou, Boukoumbé, Kouandé)","match":{"regions":["Atakora"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/benin/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BJ","level":"orange","label":"Bande Kandi–Tchaourou incluant Nikki (approx. par cercles)","match":{"near":[{"name":"Kandi","lat":11.13,"lon":2.94,"km":30},{"name":"Kandi–Nikki","lat":10.55,"lon":3,"km":30},{"name":"Nikki","lat":9.94,"lon":3.21,"km":30},{"name":"Nikki–Tchaourou","lat":9.4,"lon":2.95,"km":30},{"name":"Tchaourou","lat":8.89,"lon":2.6,"km":25}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/benin/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NE","level":"red","label":"Ensemble du territoire","match":{"all":true},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/niger/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"red","label":"Nord-Est et Nord-Ouest : États de Borno, Yobe, Gombe, Bauchi, Jigawa, Kebbi, Zamfara, Katsina, Sokoto","match":{"regions":["Borno State","Yobe State","Gombe State","Bauchi","Jigawa State","Kebbi","Zamfara State","Katsina State","Sokoto"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"red","label":"États de Kano et Kaduna (hors villes de Kano et Kaduna)","match":{"regions":["Kano State","Kaduna State"]},"except":{"near":[{"name":"Kano","lat":12,"lon":8.52,"km":20},{"name":"Kaduna","lat":10.52,"lon":7.44,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"red","label":"Sud-Est : États de Bayelsa, Rivers (hors Port Harcourt), Delta et Akwa Ibom","match":{"regions":["Bayelsa State","Rivers State","Delta","Akwa Ibom State"]},"except":{"near":[{"name":"Port Harcourt","lat":4.82,"lon":7.03,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"red","label":"Adamawa au nord de la Bénoué (approx. par cercles)","match":{"near":[{"name":"Mubi","lat":10.27,"lon":13.27,"km":60},{"name":"Gombi","lat":10.17,"lon":12.74,"km":35},{"name":"Song","lat":9.83,"lon":12.63,"km":30},{"name":"Guyuk","lat":9.9,"lon":11.94,"km":30}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"red","label":"Zone frontalière avec le Niger","match":{"borderKm":50,"with":"NE"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"red","label":"Zone frontalière avec le Bénin (hors Ogun et Lagos)","match":{"borderKm":30,"with":"BJ"},"except":{"regions":["Ogun State","Lagos"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"red","label":"Zone frontalière avec le Cameroun","match":{"borderKm":50,"with":"CM"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"red","label":"Ouest de l'État de Niger, nord et ouest du Kwara (approx. par cercles)","match":{"near":[{"name":"New Bussa / Kainji","lat":9.88,"lon":4.52,"km":70},{"name":"Niger State nord-ouest","lat":10.9,"lon":4.9,"km":60},{"name":"Kaiama","lat":9.61,"lon":3.94,"km":60},{"name":"Okuta (Baruten)","lat":9.22,"lon":3.18,"km":40}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"red","label":"Nord-ouest de l'État d'Oyo, dont le parc national d'Old Oyo (approx. par cercles)","match":{"near":[{"name":"Parc national d'Old Oyo","lat":8.62,"lon":4.14,"km":50},{"name":"Saki","lat":8.67,"lon":3.39,"km":40}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"orange","label":"Villes de Kano, Kaduna et Port Harcourt","match":{"near":[{"name":"Kano","lat":12,"lon":8.52,"km":20},{"name":"Kaduna","lat":10.52,"lon":7.44,"km":20},{"name":"Port Harcourt","lat":4.82,"lon":7.03,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"orange","label":"Middle Belt : Benue, Nasarawa, Kogi, Plateau, Taraba, est du Niger, sud et est du Kwara, Adamawa au sud de la Bénoué","match":{"regions":["Benue State","Nasarawa State","Kogi State","Plateau State","Taraba State","Niger State","Kwara State","Adamawa"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"orange","label":"Sud : États d'Ekiti, Ondo, Edo, Enugu, Anambra, Imo, Abia, Ebonyi et Cross River","match":{"regions":["Ekiti State","Ondo State","Edo State","Enugu State","Anambra","Imo State","Abia State","Ebonyi State","Cross River State"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"orange","label":"Territoire de la capitale fédérale (FCT), sauf la ville d'Abuja","match":{"regions":["FCT"]},"except":{"near":[{"name":"Abuja","lat":9.06,"lon":7.49,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"NG","level":"orange","label":"Sud-Ouest : États d'Ogun, Osun et Oyo (sauf Ibadan et Abeokuta)","match":{"regions":["Ogun State","Osun State","Oyo State"]},"except":{"near":[{"name":"Ibadan","lat":7.38,"lon":3.93,"km":20},{"name":"Abeokuta","lat":7.16,"lon":3.35,"km":12}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/nigeria/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"red","label":"Frontière somalienne (bande de 100 km : Mandera, El Wak, Dadaab, Liboi…)","match":{"borderKm":100,"with":"SO"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"red","label":"Garissa et route Garissa–Dadaab","match":{"near":[{"name":"Garissa","lat":-0.456,"lon":39.658,"km":12},{"name":"Route Garissa–Dadaab (tronçon ouest)","lat":-0.3,"lon":39.83,"km":15},{"name":"Route Garissa–Dadaab (tronçon est)","lat":-0.12,"lon":40.07,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"red","label":"Partie continentale du comté de Lamu","match":{"regions":["Lamu"]},"except":{"near":[{"name":"Île de Lamu","lat":-2.28,"lon":40.88,"km":5},{"name":"Île de Manda","lat":-2.25,"lon":40.96,"km":4},{"name":"Île de Pate","lat":-2.1,"lon":41.02,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"orange","label":"Archipel de Lamu (accès par voie aérienne uniquement)","match":{"near":[{"name":"Île de Lamu","lat":-2.28,"lon":40.88,"km":5},{"name":"Île de Manda","lat":-2.25,"lon":40.96,"km":4},{"name":"Île de Pate","lat":-2.1,"lon":41.02,"km":10}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"red","label":"Frontière avec le Soudan du Sud (triangle d'Ilemi)","match":{"borderKm":30,"with":"SS"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"red","label":"Frontière avec l'Éthiopie","match":{"borderKm":20,"with":"ET"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"orange","label":"Nord de la Turkana et de Marsabit (bande frontalière Soudan du Sud)","match":{"borderKm":60,"with":"SS"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"orange","label":"Nord de Marsabit et Moyale (bande frontalière Éthiopie)","match":{"borderKm":45,"with":"ET"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"orange","label":"Comtés de Mandera, Wajir et Garissa (hors zone rouge)","match":{"regions":["Mandera County","Wajir County","Garissa County"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"orange","label":"Est du comté de Marsabit (régions excentrées)","match":{"near":[{"name":"Est Marsabit (Kargi–Dukana)","lat":2.3,"lon":38.3,"km":80},{"name":"Nord-est Marsabit","lat":3.2,"lon":38.6,"km":60}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"orange","label":"Est du comté d'Isiolo (Merti, Mado Gashi, Garbatulla)","match":{"regions":["Isiolo County"]},"except":{"near":[{"name":"Isiolo / Archer's Post","lat":0.354,"lon":37.582,"km":50}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"orange","label":"Zones frontalières de l'Ouganda (West Pokot et Turkana)","match":{"near":[{"name":"Kacheliba","lat":1.55,"lon":35,"km":25},{"name":"Alale","lat":2.05,"lon":34.95,"km":25},{"name":"Frontière Turkana sud","lat":2.55,"lon":34.95,"km":25},{"name":"Lokiriama","lat":3.05,"lon":34.85,"km":25},{"name":"Frontière Turkana centre","lat":3.55,"lon":34.5,"km":25},{"name":"Frontière Turkana nord","lat":4,"lon":34.15,"km":25}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"orange","label":"Côte au nord de Malindi (jusqu'au comté de Lamu)","match":{"near":[{"name":"Ngomeni / Marafa","lat":-2.95,"lon":40.2,"km":20},{"name":"Kipini / delta de la Tana","lat":-2.55,"lon":40.45,"km":25}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"KE","level":"orange","label":"Nairobi : quartiers d'Eastleigh, Pangani, Kibera et Mathare","match":{"near":[{"name":"Eastleigh","lat":-1.275,"lon":36.85,"km":2},{"name":"Pangani","lat":-1.268,"lon":36.835,"km":1},{"name":"Kibera","lat":-1.313,"lon":36.787,"km":1.8},{"name":"Mathare","lat":-1.26,"lon":36.86,"km":1.2}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"UG","level":"red","label":"Frontière avec la RDC (hors parcs nationaux)","match":{"borderKm":8,"with":"CD"},"except":{"near":[{"name":"Arua","lat":3.02,"lon":30.91,"km":6},{"name":"Kisoro","lat":-1.285,"lon":29.685,"km":4}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ouganda/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"UG","level":"red","label":"Bwera et ses alentours","match":{"near":[{"name":"Bwera","lat":0.035,"lon":29.77,"km":15}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ouganda/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"UG","level":"red","label":"Frontière avec le Soudan du Sud","match":{"borderKm":8,"with":"SS"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ouganda/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"UG","level":"orange","label":"Parc national de Semuliki","match":{"near":[{"name":"Parc national de Semuliki","lat":0.83,"lon":30.1,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ouganda/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"UG","level":"orange","label":"Karamoja (est, le long de la frontière kényane, de Kidepo à Amudat)","match":{"near":[{"name":"Parc national de Kidepo","lat":3.8,"lon":33.85,"km":30},{"name":"Kaabong","lat":3.52,"lon":34.12,"km":35},{"name":"Est Kotido","lat":3,"lon":34.45,"km":30},{"name":"Moroto","lat":2.53,"lon":34.66,"km":30},{"name":"Nakapiripirit","lat":1.9,"lon":34.75,"km":25},{"name":"Amudat","lat":1.95,"lon":34.95,"km":25}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/ouganda/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TZ","level":"red","label":"Région de Mtwara","match":{"regions":["Mtwara"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tanzanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TZ","level":"red","label":"Bande frontalière avec le Mozambique","match":{"borderKm":15,"with":"MZ"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tanzanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TZ","level":"orange","label":"Kagera et Kigoma : zones frontalières du Burundi","match":{"borderKm":30,"with":"BI"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tanzanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"TZ","level":"orange","label":"Sud-est des régions de Lindi et Ruvuma","match":{"near":[{"name":"Sud Lindi (Lindi, Nachingwea)","lat":-10.2,"lon":39.3,"km":90},{"name":"Est Ruvuma (Tunduru)","lat":-10.8,"lon":37.9,"km":70}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/tanzanie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BI","level":"red","label":"Frontière avec la RDC (entre la frontière et la RN5, chaussée d'Uvira/Gatumba)","match":{"borderKm":10,"with":"CD"},"except":{"near":[{"name":"Bujumbura","lat":-3.38,"lon":29.36,"km":7},{"name":"Cibitoke","lat":-2.887,"lon":29.12,"km":3},{"name":"Rugombo","lat":-2.84,"lon":29.07,"km":3}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/burundi/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BI","level":"red","label":"Nord du parc de la Kibira et frontière rwandaise au nord de la RN10","match":{"near":[{"name":"Mabayi","lat":-2.71,"lon":29.25,"km":12},{"name":"Nord Kibira","lat":-2.75,"lon":29.36,"km":10},{"name":"Nord-est Kibira","lat":-2.74,"lon":29.48,"km":9}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/burundi/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BI","level":"orange","label":"Provinces de Cibitoke et Bubanza (entre la Kibira et la RDC)","match":{"regions":["Cibitoke","Bubanza"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/burundi/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BI","level":"orange","label":"Centre de la forêt de la Kibira (au nord du mont Teza)","match":{"near":[{"name":"Kibira centrale","lat":-3,"lon":29.45,"km":12}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/burundi/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"BI","level":"orange","label":"Zone frontalière avec le Rwanda","match":{"borderKm":20,"with":"RW"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/burundi/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"AO","level":"orange","label":"Provinces de Lunda Norte, Lunda Sul et Cabinda","match":{"regions":["Luanda Norte","Lunda Sul","Cabinda"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/angola/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"ZM","level":"orange","label":"Frontière avec la RDC (Nord-Ouest et Copperbelt)","match":{"borderKm":10,"with":"CD"},"except":{"regions":["Luapula Province","Northern Province"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/zambie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"ZM","level":"orange","label":"Frontière angolaise au nord de Chavuma","match":{"borderKm":10,"with":"AO"},"except":{"regions":["Western Province"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/zambie/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MZ","level":"red","label":"Province du Cabo Delgado (y compris Pemba, Ibo et Quirimbas)","match":{"regions":["Cabo Delgado Province"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mozambique/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MZ","level":"red","label":"Province du Cabo Delgado (y compris Pemba, Ibo et Quirimbas)","match":{"near":[{"name":"Nangade / Palma","lat":-10.9,"lon":39.3,"km":60},{"name":"Mocímboa da Praia / Palma","lat":-10.9,"lon":40.3,"km":60},{"name":"Mueda","lat":-11.7,"lon":38.8,"km":60},{"name":"Muidumbe / Macomia","lat":-11.7,"lon":39.8,"km":60},{"name":"Côte Macomia–Quissanga","lat":-11.8,"lon":40.5,"km":45},{"name":"Ibo / Quirimbas","lat":-12.4,"lon":40.55,"km":30},{"name":"Montepuez","lat":-12.5,"lon":38.8,"km":60},{"name":"Ancuabe / Meluco","lat":-12.5,"lon":39.9,"km":60},{"name":"Pemba","lat":-12.9,"lon":40.5,"km":30},{"name":"Balama / Namuno","lat":-13.2,"lon":39,"km":60},{"name":"Chiúre / Mecúfi","lat":-13.2,"lon":40,"km":60}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mozambique/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MZ","level":"red","label":"Tiers est de la province du Niassa","match":{"near":[{"name":"Mecula / réserve du Niassa","lat":-11.8,"lon":37.8,"km":55},{"name":"Marrupa nord","lat":-12.6,"lon":37.8,"km":55},{"name":"Marrupa / Nipepe","lat":-13.4,"lon":37.9,"km":50}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mozambique/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MZ","level":"red","label":"Frontière avec la Tanzanie (Rovuma), jusqu'au Malawi","match":{"borderKm":15,"with":"TZ"},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mozambique/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MZ","level":"red","label":"Nord de la province de Nampula (Memba, Eráti, Mecubúri, Lalaua, Nacarôa, nord de Nampula/Monapo/Meconta/Nacala)","match":{"near":[{"name":"Lalaua","lat":-14.35,"lon":38,"km":40},{"name":"Mecubúri","lat":-14.35,"lon":38.7,"km":40},{"name":"Nord Nampula / Muecate sud","lat":-14.35,"lon":39.4,"km":40},{"name":"Eráti / Nacarôa","lat":-14.35,"lon":40.1,"km":40},{"name":"Memba","lat":-14.17,"lon":40.52,"km":30}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mozambique/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MZ","level":"orange","label":"Ouest de la province du Niassa (Lichinga, Cuamba)","match":{"regions":["Niassa Province"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mozambique/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MZ","level":"orange","label":"Ouest de la province du Niassa (Lichinga, Cuamba)","match":{"near":[{"name":"Rive du lac Malawi nord","lat":-12,"lon":35.6,"km":60},{"name":"Muembe / Mavago","lat":-12,"lon":36.6,"km":60},{"name":"Lichinga","lat":-13,"lon":35.3,"km":60},{"name":"Majune","lat":-13,"lon":36.5,"km":60},{"name":"Ngauma / Mandimba nord","lat":-13.9,"lon":35.7,"km":50},{"name":"Maúa / Metarica","lat":-13.9,"lon":36.6,"km":50},{"name":"Cuamba","lat":-14.7,"lon":36.3,"km":40},{"name":"Mandimba","lat":-14.7,"lon":35.6,"km":35}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mozambique/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"MZ","level":"orange","label":"Province de Nampula : villes de Nampula et Nacala, sud de Nacala/Monapo/Nampula, Mossuril, nord de Muecate, Ribáuè, Malema","match":{"near":[{"name":"Nampula","lat":-15.12,"lon":39.27,"km":25},{"name":"Nacala","lat":-14.56,"lon":40.68,"km":20},{"name":"Monapo","lat":-14.92,"lon":40.3,"km":20},{"name":"Mossuril","lat":-14.85,"lon":40.62,"km":15},{"name":"Muecate","lat":-14.9,"lon":39.62,"km":15},{"name":"Ribáuè","lat":-14.97,"lon":38.28,"km":35},{"name":"Entre Ribáuè et Nampula","lat":-15,"lon":38.8,"km":25},{"name":"Malema","lat":-14.95,"lon":37.41,"km":35}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/mozambique/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"ZW","level":"orange","label":"Champs diamantifères de Marange","match":{"near":[{"name":"Marange (Chiadzwa)","lat":-19.65,"lon":32.36,"km":20}]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/zimbabwe/conseils-aux-voyageurs-securite","date":"2026-09-15"},
      {"country":"ZW","level":"orange","label":"Frontière nord avec le Mozambique (mines antipersonnel)","match":{"borderKm":10,"with":"MZ"},"except":{"regions":["Manicaland","Masvingo Province"]},"source":"https://www.diplomatie.gouv.fr/fr/information-par-pays/zimbabwe/conseils-aux-voyageurs-securite","date":"2026-09-15"}
    ];

    var CV_CONCELHO_TO_ISLAND = {
      'CV-07': 'santoAntao', 'CV-05': 'santoAntao', 'CV-21': 'santoAntao',
      'CV-11': 'saoVicente',
      'CV-22': 'saoNicolau', 'CV-27': 'saoNicolau',
      'CV-08': 'sal',
      'CV-01': 'boaVista',
      'CV-04': 'maio',
      'CV-20': 'santiago', 'CV-19': 'santiago', 'CV-15': 'santiago', 'CV-16': 'santiago',
      'CV-26': 'santiago', 'CV-25': 'santiago', 'CV-17': 'santiago', 'CV-23': 'santiago',
      'CV-14': 'santiago',
      'CV-13': 'fogo', 'CV-18': 'fogo', 'CV-24': 'fogo',
      'CV-02': 'brava'
    };

    var SEA_CROSSINGS = {
      // Oust-Louga-Baltiïsk (Kaliningrad), Oboronlogistika, ordre n° 219 du 8 juillet 2026 en vigueur
      // depuis le 10 juillet 2026, prix hors TVA majorés de la TVA de 22 % : voiture jusqu'à 5 m 27 040 ₽
      // (32 989 ₽ ≈ 328 €), minibus ou utilitaire jusqu'à 6 m 31 930 ₽ (≈ 387 €), moto 8 000 ₽ (≈ 97 €),
      // passager en cabine avec repas 9 420 ₽ (≈ 114 € ; aucune place sans cabine). Hors surcharge
      // carburant mensuelle (90 à 1 360 ₽ par mètre de véhicule), variable et non modélisée. ~38 h de
      // traversée ; distance : orthodromie calculée (757 km), la route maritime n'étant pas publiée.
      // Traversée entre ZONES (comme Ceuta) : Kaliningrad partage la masse continentale européenne, mais
      // la traversée reste proposée en plus des routes par la Lituanie et la Pologne.
      'RU|RU-KGD': { routeKey:'ferry.route.kaliningrad', durationH:38, distanceKm:757, priceByClass:{1:328, 2:387, 5:97, foot:114} },
      'ES|ES-CE': { routeKey:'ferry.route.ceuta', durationH:1.5, distanceKm:31.5, priceByClass:{1:50, 2:99, 5:50, foot:35} },
      'ES|ES-ML': { routeKey:'ferry.route.melilla', durationH:6.5, distanceKm:210, priceByClass:{1:40, 2:40, 5:40, foot:50} }
    };

    var BUDGET_PRICE_MAX = {
      EUR: { economique: 70, moyen: 130, confortable: 260 },
      CHF: { economique: 130, moyen: 250, confortable: 480 },
      GBP: { economique: 60, moyen: 120, confortable: 220 },
      CZK: { economique: 1000, moyen: 2000, confortable: 4000 },
      BAM: { economique: 100, moyen: 180, confortable: 350 },
      PLN: { economique: 250, moyen: 450, confortable: 900 },
      HUF: { economique: 10000, moyen: 20000, confortable: 40000 },
      // Danemark : contrairement à CZK/PLN/HUF/BAM ci-dessus (tous MOINS chers que la zone euro), le
      // Danemark est un pays PLUS cher — même profil que la Suisse (CHF ci-dessus). Copenhague : loyer
      // Airbnb médian ~1150-1250 DKK/nuit (~155-170 €, airroi.com 2026), fourchette usuelle ~800-1800 DKK
      // couvrant ~80% des annonces — paliers calés pour que le prix médian tombe dans la tranche "moyen"
      // plutôt qu'en dessous, comme pour les autres devises. Taux de conversion : couronne danoise à
      // parité FIXE avec l'euro depuis 1982 (ERM II, bande étroite ±2,25%) — 1 EUR ≈ 7,46 DKK.
      DKK: { economique: 700, moyen: 1300, confortable: 2600 },
      // Norvège : même profil "plus cher que la zone euro" que le Danemark/la Suisse. Oslo : loyer
      // Airbnb médian ~140 $ (~130 €, airroi/airbtics 2026). Taux de conversion : couronne norvégienne
      // FLOTTANTE (contrairement à la couronne danoise, sans parité fixe avec l'euro) — 1 EUR ≈ 10,85
      // NOK début septembre 2026 (xe.com/ecb.europa.eu).
      NOK: { economique: 1000, moyen: 1800, confortable: 3600 },
      // Suède : même profil que le Danemark/la Norvège. Stockholm : loyer Airbnb médian ~159 $ (~142 €,
      // airroi 2026). Couronne suédoise FLOTTANTE (comme la norvégienne, contrairement à la danoise) —
      // 1 EUR ≈ 11,15 SEK début septembre 2026 (xe.com).
      SEK: { economique: 1000, moyen: 1900, confortable: 3800 },
      // Albanie : contrairement aux devises nordiques ci-dessus, un pays MOINS cher que la zone euro —
      // même profil que la République tchèque/la Pologne/la Hongrie/la Bosnie-Herzégovine. Tirana :
      // loyer Airbnb médian ~55-60 $/~52-56 € (airdna/airroi 2026). Lek albanais hors zone euro,
      // flottant — 1 EUR ≈ 93 ALL début septembre 2026 (bankofalbania.org/wise.com).
      ALL: { economique: 3700, moyen: 7000, confortable: 14000 },
      // Serbie : encore un pays moins cher que la zone euro, même profil que la Bosnie-Herzégovine
      // voisine — Belgrade (la ville la plus chère du pays) : loyer Airbnb médian ~6 700 RSD/nuit
      // (~57 €), fourchette couvrant ~80% des annonces ~4 600-12 300 RSD (~39-105 €), jusqu'à
      // ~16 400 RSD (~140 €) dans les quartiers premium (Belgrade Waterfront/Savski Venac) —
      // échantillon airdna.co/investropa.com 2026. Paliers calés à ~75% de la conversion EUR->RSD au
      // taux de référence (117 RSD, voir COUNTRIES.RS.currency) — ratio proche de celui déjà retenu
      // pour BAM (~70%), cohérent avec un niveau de vie comparable entre les deux pays voisins.
      RSD: { economique: 6000, moyen: 11000, confortable: 23000 },
      // Macédoine du Nord : pays encore moins cher que la Serbie/la Bosnie-Herzégovine — Skopje (la
      // ville la plus chère du pays) : loyer Airbnb moyen ~42-55 $/nuit selon le mois (~39-51 €),
      // appartements dès ~39-44 $/nuit (~36-41 €) — échantillon airdna.co/airbnb.com 2026, pas de
      // prix publié directement en denars (obligeant à convertir depuis le dollar plutôt que lire un
      // montant MKD natif comme pour les autres devises ci-dessus). Paliers calés à ~55-60% de la
      // conversion EUR->MKD au cours cible officiel (61,5 MKD, voir COUNTRIES.MK.currency) — un cran
      // sous la Serbie/la Bosnie-Herzégovine (~70-75%), cohérent avec le coût de la vie généralement
      // plus bas en Macédoine du Nord au sein de la région.
      MKD: { economique: 2500, moyen: 4500, confortable: 9000 },
      // Roumanie : profil "moins cher que la zone euro" comparable à la Serbie — Bucarest (la ville la
      // plus chère du pays) : loyer Airbnb médian national ~305 RON/nuit (~58 €), quartiers premium de
      // la capitale (Herăstrău-Floreasca) ~90-130 €/nuit, quartiers plus abordables (Drumul Taberei)
      // ~35-50 €/nuit — échantillon airroi.com/airbtics.com 2026. Paliers calés à ~75% de la conversion
      // EUR->RON au taux flottant (~5,25 RON, voir COUNTRIES.RO.currency) — même ratio que la Serbie,
      // cohérent avec un niveau de vie comparable entre pays d'Europe du Sud-Est hors zone euro.
      RON: { economique: 280, moyen: 500, confortable: 1000 },
      // Islande : PLUS cher que la zone euro — même profil que la Suisse/le Danemark/la Norvège/la
      // Suède ci-dessus, pas celui des pays d'Europe centrale/balkanique moins chers. Loyer Airbnb
      // médian pour un appartement privé au centre de Reykjavík ~28 285 ISK/nuit (~198 €, adventures.is
      // 2026), nettement au-dessus des trois couronnes nordiques voisines (~165-175 € pour leur propre
      // palier "moyen" ci-dessus) — cohérent avec la réputation du pays. Paliers calés pour que ce prix
      // médian tombe dans la tranche "moyen", au taux flottant ~140,8 ISK pour 1 EUR (voir
      // COUNTRIES.IS.currency) ; ratios économique/confortable identiques à ceux des trois couronnes
      // nordiques (~0,55× et 2× le palier moyen) faute de repère spécifique à l'Islande.
      ISK: { economique: 15000, moyen: 28000, confortable: 56000 },
      // Gibraltar : contrairement à la plupart des autres devises hors zone euro de cette table,
      // PAS un pays moins cher — un territoire dense et cher, comparable ou supérieur au Royaume-Uni
      // malgré sa taille : logement vacances ~£103/nuit en moyenne (rentgibraltar.com/momondo.co.uk
      // 2026), chambres privées ~£70-80, hôtels/locations haut de gamme ~£150-200 — nettement
      // au-dessus du palier "moyen" déjà retenu pour GBP (120) plus haut. Paliers propres plutôt que
      // réutiliser tels quels ceux du Royaume-Uni, malgré la parité 1:1 GIP/GBP (voir COUNTRIES.GI) :
      // économique calé sur la chambre privée (~75), moyen sur la moyenne vacation-rental (~105),
      // confortable sur le haut de la fourchette hôtelière (~200).
      GIP: { economique: 75, moyen: 105, confortable: 200 },
      // Moldavie : pays moins cher que la zone euro, profil proche de la Roumanie/la Serbie
      // voisines — Chişinău (la ville la plus chère du pays) : loyer vacances moyen ~51-55 $/nuit
      // (~47-51 €, airroi.com/airbnb.com 2026). Paliers calés pour que ce prix moyen tombe dans la
      // tranche "moyen" (~1000 MDL, soit ~50 € au taux ~20,1 MDL/EUR retenu pour COUNTRIES.MD.currency),
      // ratios économique/confortable identiques à ceux déjà utilisés pour les devises est-européennes
      // voisines (~0,55× et 2× le palier moyen, comme MKD/RSD plus haut).
      MDL: { economique: 550, moyen: 1000, confortable: 2000 },
      // Biélorussie : Minsk (ville la plus chère du pays) : locations vacances très variables selon
      // le quartier, de ~$41-50/nuit pour les biens basiques jusqu'à ~$70-100 en centre-ville bien
      // noté, ~$125 pour le haut de gamme (expedia.com/cozycozy.com 2026 — pas de repère Airbnb natif
      // publié directement en BYN). Palier "moyen" calé sur le milieu de la fourchette centre-ville
      // (~$65, ~60 € début septembre 2026) converti au taux ~3,4 BYN/EUR retenu pour
      // COUNTRIES.BY.currency (~200 BYN), mêmes ratios 0,55×/2× que la Moldavie ci-dessus.
      BYN: { economique: 110, moyen: 200, confortable: 400 },
      // Ukraine : Kyiv (ville la plus chère du pays, largement représentative malgré la guerre en
      // cours) : loyer vacances moyen ~38-41 $/nuit (~35-38 €, airroi.com 2026) — pays moins cher que
      // la zone euro, profil proche de la Moldavie/la Biélorussie ci-dessus. Palier "moyen" calé sur
      // ce prix moyen (~37 €) converti au taux ~51,9 UAH/EUR retenu pour COUNTRIES.UA.currency
      // (~1900 UAH), mêmes ratios 0,55×/2× que la Moldavie/la Biélorussie.
      UAH: { economique: 1050, moyen: 1900, confortable: 3800 },
      // Turquie : Istanbul (ville la plus chère du pays) — loyer vacances médian ~74-75 $/nuit
      // (~70 €, airroi.com/investropa.com 2026, premier semestre), quartiers premium (Galata/Cihangir
      // à Beyoğlu) ~95-160 $/nuit, quartiers plus abordables ~50-70 $/nuit. Palier "moyen" calé sur ce
      // loyer médian (~70 €) converti au taux ~56,3 TRY/EUR retenu pour COUNTRIES.TR.currency
      // (~4000 TRY), mêmes ratios 0,55×/2× que la Moldavie/la Biélorussie/l'Ukraine ci-dessus.
      TRY: { economique: 2200, moyen: 4000, confortable: 8000 },
      // Géorgie : Tbilissi (ville la plus chère du pays) — loyer vacances médian ~$49-58/nuit
      // (airdna.co/airroi.com 2026), ~€43-50 aux taux courants — pays moins cher que la zone euro,
      // profil proche de l'Ukraine/la Moldavie ci-dessus. Palier "moyen" calé sur ce loyer médian
      // (~€45) converti au taux ~3,04 GEL/EUR retenu pour COUNTRIES.GE.currency (~130 GEL), mêmes
      // ratios 0,55×/2× que la Moldavie/la Biélorussie/l'Ukraine/la Turquie ci-dessus.
      GEL: { economique: 70, moyen: 130, confortable: 260 },
      // Arménie : Erevan (ville la plus chère du pays) — profil proche de la Géorgie/l'Ukraine
      // voisines (pays moins cher que la zone euro), aucune source de loyer vacances aussi directe
      // que pour les autres devises de cette table n'a été vérifiée pour cet ajout précis ; palier
      // "moyen" calé sur une estimation prudente cohérente avec le reste de la région (~€40)
      // convertie au taux ~420 AMD/EUR retenu pour COUNTRIES.AM.currency (~17 000 AMD), mêmes ratios
      // 0,55×/2× que la Géorgie/l'Ukraine/la Moldavie ci-dessus — à affiner si une source de loyer
      // vacances dédiée à Erevan est identifiée plus tard.
      AMD: { economique: 9500, moyen: 17000, confortable: 34000 },
      // Azerbaïdjan : Bakou (ville la plus chère du pays, capitale pétrolière) — nettement plus chère
      // que ses voisines caucasiennes Erevan/Tbilissi, profil plus proche d'Istanbul ; même réserve
      // que pour l'Arménie ci-dessus (aucune source de loyer vacances dédiée vérifiée pour cet ajout
      // précis). Palier "moyen" calé sur une estimation prudente (~€60) convertie au taux ~1,85
      // AZN/EUR retenu pour COUNTRIES.AZ.currency (~110 AZN), mêmes ratios 0,55×/2×.
      AZN: { economique: 60, moyen: 110, confortable: 220 },
      // Syrie : la nouvelle livre syrienne n'a été mise en circulation que le 1er/3 janvier 2026 (voir
      // COUNTRIES.SY.currency) — AUCUN taux de change EUR/nouvelle-SYP stable ni AUCUNE donnée de
      // loyer vacances fiable n'a pu être vérifié pour cet ajout (marché du logement touristique
      // quasi inexistant après la guerre civile). Palier "moyen" calé sur une estimation TRÈS prudente
      // (~€25, profil "après-guerre, coût de la vie bas") convertie à un taux approximatif de
      // ~160 SYP/EUR (ordre de grandeur déduit du ratio de redénomination 100:1 et des derniers cours
      // informels connus de l'ancienne livre, PAS une source de change vérifiée) — à corriger dès
      // qu'un taux fiable existe plutôt que de laisser un placeholder non documenté ; ratios 0,55×/2×
      // identiques au reste de la table par défaut.
      SYP: { economique: 2200, moyen: 4000, confortable: 8000 },
      // Liban/Israël/Jordanie/Égypte/Libye, dernier ajout en date : aucune recherche dédiée de loyer
      // vacances (type airroi.com/airdna.co déjà utilisé ailleurs dans cette table) n'a été effectuée
      // pour ces cinq devises lors de cet ajout — paliers dérivés du taux de change retenu pour chaque
      // COUNTRIES.XX.currency et d'une estimation prudente cohérente avec le profil économique déjà
      // documenté de chaque pays (même réserve déjà appliquée à AMD/AZN/SYP lors de l'ajout précédent),
      // À AFFINER si une source de loyer vacances dédiée est identifiée plus tard.
      // Liban : économie de facto dollarisée (voir COUNTRIES.LB.currency) — estimation ~55 €/nuit
      // convertie au taux ~96 500 LBP/EUR retenu (~5 300 000 LBP), magnitude en cohérence avec
      // l'hyperinflation du pays plutôt qu'une erreur d'unité.
      LBP: { economique: 3000000, moyen: 5300000, confortable: 10600000 },
      // Israël : destination réputée chère, profil proche de l'Europe de l'Ouest plutôt que de ses
      // voisins régionaux — estimation ~130 €/nuit convertie au taux ~3,5 ILS/EUR retenu (~455 ILS).
      ILS: { economique: 250, moyen: 450, confortable: 900 },
      // Jordanie : dinar arrimé au dollar, devise "forte" (voir COUNTRIES.JO.currency) — estimation
      // ~55 €/nuit convertie au taux ~0,82 JOD/EUR retenu (~45 JOD).
      JOD: { economique: 25, moyen: 45, confortable: 90 },
      // Égypte : destination touristique établie de longue date, tarifs généralement abordables pour
      // des visiteurs européens — estimation ~38 €/nuit convertie au taux ~59,5 EGP/EUR retenu
      // (~2260 EGP).
      EGP: { economique: 1250, moyen: 2250, confortable: 4500 },
      // Libye : quasi aucun marché du logement touristique international actif (voir la limite de
      // sécurité documentée dans COUNTRIES.LY) — estimation TRÈS prudente ~30 €/nuit convertie au
      // taux officiel ~6,8 LYD/EUR retenu (~200 LYD, à distinguer du taux de marché parallèle
      // nettement plus faible, voir COUNTRIES.LY.currency).
      LYD: { economique: 110, moyen: 200, confortable: 400 },
      // Maroc — la calibration la mieux sourcée de tout ce lot, deux jeux indépendants qui
      // convergent : étude du ministère du Tourisme citée devant le Parlement (nuitée moyenne de
      // juillet : 3★ 500 MAD, 4★ 1 000 MAD, 5★ 2 100 MAD) et recette moyenne par chambre louée de
      // l'Observatoire du Tourisme au T1 2026 (1-3★ 508 MAD, 4★ 894 MAD, luxe 2 365 MAD).
      MAD: { economique: 500, moyen: 1000, confortable: 2300 },
      // Algérie — AUCUN prix moyen officiel n'existe publiquement : l'ONS ne publie que nuitées et
      // capacité, jamais de prix, et les agrégateurs internationaux sont inutilisables ici (ils
      // donnent 3★ et 4★ au même prix, avec des lignes aberrantes). Calibré sur des sources locales
      // en dinars, concordantes entre elles mais NON statistiques : 2★ 3 000-4 000 DA, 3★ 5 000-8 000,
      // 4★ 10 000-15 000, 5★ 18 000-25 000. Fiabilité la plus faible du lot, assumée comme telle.
      DZD: { economique: 4000, moyen: 8000, confortable: 18000 },
      // Tunisie — l'INS ne publie qu'une VARIATION (prix des services hôteliers +15,4 % sur un an en
      // juin 2026), jamais un niveau. Calibré sur un agrégateur commercial (3★ moyenne 294 TND) et
      // sur des fourchettes saisonnières publiées. À nuancer : le taux d'occupation annuel du pays
      // est de 35,3 %, signe d'une saisonnalité très marquée qu'une gamme annuelle unique ne rend pas.
      TND: { economique: 150, moyen: 300, confortable: 600 },
      // ── LOT AFRIQUE DE L'OUEST ──────────────────────────────────────────────────────────────
      // **Le Cap-Vert est le seul des treize à être calibré sur de VRAIES données de marché.**
      // Institut national de statistique (INE-CV), « Inventário Anual de Estabelecimentos
      // Hoteleiros », prix moyen journalier 2025 en escudos, par catégorie d'établissement :
      // résidences et hébergement complémentaire 4 387-5 154 ; pensions et pousadas 5 263-6 080 ;
      // chambre double toutes catégories 6 750 (basse saison) à 7 738 (haute) ; hôtels 10 220-12 931 ;
      // suites 12 481-14 484. Les trois gammes reprennent ces paliers réels.
      CVE: { economique: 5000, moyen: 7700, confortable: 14500 },
      // Les DOUZE AUTRES pays n'ont AUCUNE statistique publique de prix hôtelier exploitable, et ce
      // n'est pas un défaut de recherche : les offices nationaux du Mali et de la Mauritanie ne
      // produisent tout simplement pas de chapitre tourisme, et le recensement hôtelier sierra-léonais
      // de 2020 a délibérément exclu toute question tarifaire. Les seuls barèmes couvrant les treize
      // pays (per diem du Département d'État américain et de la Commission européenne) sont des
      // PLAFONDS administratifs qui ne décrivent que le haut du marché : en déduire un « économique »
      // par division serait exactement l'extrapolation que ce projet s'interdit. Deux ancres
      // officielles existent mais ne sont pas des prix de chambre et datent de 2015-2018 (Sénégal
      // 25 604 FCFA par touriste et par jour, Burkina ~34 700 FCFA par nuitée-personne).
      // CHOIX RETENU, explicite : la gamme euro du projet (70 / 130 / 260) convertie au taux officiel
      // de chaque devise. Ce n'est PAS une observation de marché local, et c'est documenté comme tel.
      // Taux utilisés : XOF 655,957 (parité fixe, BCEAO) · MRU 46,25 (Banque centrale de Mauritanie,
      // 15/09/2026) · GMD 84,83 (Central Bank of The Gambia, 16/09/2026) · GNF 10 145,87 (BCRG,
      // 15/09/2026) · SLE 26,32 (Bank of Sierra Leone, 15/09/2026) · GHS 13,2525 (Bank of Ghana,
      // 15/09/2026) · LRD 210,74 (taux comptable InforEuro de la Commission européenne, la Banque
      // centrale du Liberia ne cotant que le dollar américain).
      XOF: { economique: 45000, moyen: 85000, confortable: 170000 },
      MRU: { economique: 3200, moyen: 6000, confortable: 12000 },
      GMD: { economique: 6000, moyen: 11000, confortable: 22000 },
      GNF: { economique: 710000, moyen: 1320000, confortable: 2640000 },
      SLE: { economique: 1800, moyen: 3400, confortable: 6800 },
      GHS: { economique: 930, moyen: 1700, confortable: 3450 },
      LRD: { economique: 15000, moyen: 27000, confortable: 55000 },
      // Lot Sahel / Corne : AUCUNE statistique publique de prix hôtelier trouvée pour les onze pays.
      // Même choix documenté que pour l'Afrique de l'Ouest — gamme euro (70 / 130 / 260) convertie au
      // taux comptable officiel InforEuro de la Commission européenne de septembre 2026, les banques
      // centrales concernées ne publiant pas de cours lisible : XAF 655,957 (parité fixe) ·
      // NGN 1 567,85 · SDG 4 302,47 · SSP 6 561,37 · ERN 17,55 · ETB 189,03 · DJF 207,33 · SOS 665,95.
      // Ce n'est PAS une observation de marché local.
      XAF: { economique: 45000, moyen: 85000, confortable: 170000 },
      NGN: { economique: 110000, moyen: 204000, confortable: 408000 },
      SDG: { economique: 301000, moyen: 559000, confortable: 1119000 },
      SSP: { economique: 459000, moyen: 853000, confortable: 1706000 },
      ERN: { economique: 1230, moyen: 2280, confortable: 4560 },
      ETB: { economique: 13200, moyen: 24600, confortable: 49100 },
      DJF: { economique: 14500, moyen: 27000, confortable: 53900 },
      SOS: { economique: 46600, moyen: 86600, confortable: 173100 },
      // Lot Afrique orientale, centrale et australe / océan Indien. Même méthode : gamme euro (70 / 130
      // / 260) convertie au taux InforEuro de septembre 2026 (1 EUR = KES 150,785 · UGX 4 375,5 ·
      // TZS 3 085 · RWF 1 713,64 · BIF 3 486,5 · CDF 2 674,25 · STN 24,5 · AOA 1 071,57 · ZMW 22,17 ·
      // MWK 2 020,16 · MZN 74,11 · ZWG 30,85 · BWP 15,57 · ZAR/NAD/SZL/LSL 18,63 · MGA 5 047,5 ·
      // MUR 54,54 · SCR 17,18), et à la parité fixe officielle pour le franc comorien (491,96775).
      // UN SEUL pays du lot publie une statistique officielle de prix hôtelier : l'Afrique du Sud (Stats
      // SA, P6410, juin 2026, publiée le 25 août 2026) — revenu moyen par nuitée vendue R1 446,7 à
      // l'hôtel, R1 670,9 tous hébergements. Ce chiffre tombe dans la tranche "moyen" ci-dessous
      // (R1 300-2 420) : la conversion est cohérente avec le marché réel, sans retouche.
      KES: { economique: 10600, moyen: 19600, confortable: 39200 },
      UGX: { economique: 306000, moyen: 569000, confortable: 1138000 },
      TZS: { economique: 216000, moyen: 401000, confortable: 802000 },
      RWF: { economique: 120000, moyen: 223000, confortable: 446000 },
      BIF: { economique: 244000, moyen: 453000, confortable: 906000 },
      CDF: { economique: 187000, moyen: 348000, confortable: 695000 },
      STN: { economique: 1715, moyen: 3185, confortable: 6370 },
      AOA: { economique: 75000, moyen: 139000, confortable: 279000 },
      ZMW: { economique: 1550, moyen: 2880, confortable: 5760 },
      MWK: { economique: 141000, moyen: 263000, confortable: 525000 },
      MZN: { economique: 5190, moyen: 9630, confortable: 19270 },
      ZWG: { economique: 2160, moyen: 4010, confortable: 8020 },
      BWP: { economique: 1090, moyen: 2020, confortable: 4050 },
      NAD: { economique: 1300, moyen: 2420, confortable: 4840 },
      ZAR: { economique: 1300, moyen: 2420, confortable: 4840 },
      SZL: { economique: 1300, moyen: 2420, confortable: 4840 },
      LSL: { economique: 1300, moyen: 2420, confortable: 4840 },
      KMF: { economique: 34400, moyen: 64000, confortable: 127900 },
      MGA: { economique: 353000, moyen: 656000, confortable: 1312000 },
      MUR: { economique: 3820, moyen: 7090, confortable: 14180 },
      SCR: { economique: 1200, moyen: 2230, confortable: 4470 },
      // Livre de Sainte-Hélène : gamme euro × 0,8572 (InforEuro septembre 2026, parité avec la livre
      // sterling). Aucune statistique officielle de prix par nuitée (le seul chiffre publié, en 2018, est
      // une dépense moyenne par visiteur, pas un prix de chambre).
      SHP: { economique: 60, moyen: 110, confortable: 220 },
      // Rouble : calé sur la statistique OFFICIELLE Rosstat des prix moyens à la consommation (août 2026,
      // prix par PERSONNE et par nuit) — hôtel 1* 1 867,97 ₽, 3* 2 665,48 ₽, 4-5* 4 088,59 ₽ —, doublée
      // pour 2 adultes : une chambre 3* (~5 330 ₽) tient dans "economique", une 4-5* (~8 180 ₽) dans
      // "moyen". Nettement sous la conversion de la gamme euro (InforEuro septembre 2026 : 100,57 ₽ pour
      // 1 €, soit 7 040 / 13 070 / 26 150 ₽), la Russie étant moins chère que la zone euro.
      RUB: { economique: 5400, moyen: 8200, confortable: 16400 },
      // Péninsule Arabique, Irak, Iran : gamme euro (70 / 130 / 260) convertie au taux InforEuro de
      // septembre 2026 (1 EUR = SAR 4,371 · AED 4,280 · QAR 4,238 · BHD 0,439 · OMR 0,448 · KWD 0,357 ·
      // IQD 1 525 · IRR 1 600 447 · YER 621). Contrôles contre les statistiques OFFICIELLES publiées :
      // prix moyen par nuit GASTAT (Arabie saoudite, T1 2026) 423 SAR et NCSI (Oman, hôtels 3-5*, T1 2026)
      // 57,5 OMR tombent tous deux dans la tranche "moyen" ; Dubaï (579 AED en 2025, chiffre attribué au
      // Department of Economy and Tourism, page source inaccessible) la dépasse légèrement — ville plus
      // chère que la moyenne du pays, conversion laissée telle quelle.
      SAR: { economique: 310, moyen: 570, confortable: 1140 },
      AED: { economique: 300, moyen: 560, confortable: 1110 },
      QAR: { economique: 300, moyen: 550, confortable: 1100 },
      BHD: { economique: 31, moyen: 57, confortable: 114 },
      OMR: { economique: 31, moyen: 58, confortable: 117 },
      KWD: { economique: 25, moyen: 46, confortable: 93 },
      IQD: { economique: 107000, moyen: 198000, confortable: 397000 },
      IRR: { economique: 112000000, moyen: 208000000, confortable: 416000000 },
      YER: { economique: 43500, moyen: 80800, confortable: 161500 }
    };

  var COUNTRY_LIST = Object.keys(COUNTRIES);
  var ALIAS_COUNTRY_LIST = COUNTRY_LIST.filter(function(cc){ return COUNTRIES[cc].aliasFile; });

  return {
    COUNTRIES: COUNTRIES, COUNTRY_LIST: COUNTRY_LIST, ALIAS_COUNTRY_LIST: ALIAS_COUNTRY_LIST,
    TRANSPORT: TRANSPORT, EV_RANGE_KM: EV_RANGE_KM, EV_CHARGE_MARGIN: EV_CHARGE_MARGIN,
    TOLL_RATE_BY_CLASS: TOLL_RATE_BY_CLASS, TOLL_RATE_BY_COUNTRY: TOLL_RATE_BY_COUNTRY,
    TOLL_MIN_DISTANCE_KM: TOLL_MIN_DISTANCE_KM,
    HR_ISLAND_POSTCODES: HR_ISLAND_POSTCODES, HR_POSTCODE_TO_ISLAND: HR_POSTCODE_TO_ISLAND,
    CV_CONCELHO_TO_ISLAND: CV_CONCELHO_TO_ISLAND,
    ISLAND_BOXES: ISLAND_BOXES,
    ISLAND_ONLY_COUNTRIES: ISLAND_ONLY_COUNTRIES,
    NO_TRIP_LANDMASSES: NO_TRIP_LANDMASSES,
    TENSION_ZONES: TENSION_ZONES,
    WADDEN_ISLANDS: WADDEN_ISLANDS, SARDINIA_PROVINCES: SARDINIA_PROVINCES, SICILY_PROVINCES: SICILY_PROVINCES,
    GR_POROS_MAINLAND_NAMES: GR_POROS_MAINLAND_NAMES, GR_ISLAND_PATTERNS: GR_ISLAND_PATTERNS,
    FERRY_ROUTES: FERRY_ROUTES, SEA_CROSSINGS: SEA_CROSSINGS, BUDGET_PRICE_MAX: BUDGET_PRICE_MAX
  };
});
