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
      TR: { code:'TR', name:'Turquie', file:'communes-tr.txt', hasToll:true, aliasFile:'aliases-tr.txt', currency:'TRY' }
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
      TR: { 1: 0.063, 2: 0.101, 5: 0.045 }
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
      'continental|suduroy': { routeKey:'ferry.route.suduroy', durationH:2.08, distanceKm:65, priceByClass:{1:229, 2:344, 5:92, foot:109} },
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
      'continental|gokceada': { routeKey:'ferry.route.gokceada', durationH:1.25, distanceKm:30, priceByClass:{1:12, 2:14, 5:5, foot:2} }
    };
    // Les cinq îles Wadden partagent toutes le même tarif (celui de TESO/Texel, voir "Ferries" du
    // README) : ajoutées par boucle plutôt que répétées cinq fois à la main dans la table ci-dessus.
    WADDEN_ISLANDS.forEach(function(island){
      FERRY_ROUTES['continental|wadden-' + island] = { routeKey:'ferry.route.wadden', durationH:0.33, distanceKm:5, priceByClass:{1:18, 2:27, 5:9, foot:6} };
    });

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
      TRY: { economique: 2200, moyen: 4000, confortable: 8000 }
    };

  var COUNTRY_LIST = Object.keys(COUNTRIES);
  var ALIAS_COUNTRY_LIST = COUNTRY_LIST.filter(function(cc){ return COUNTRIES[cc].aliasFile; });

  return {
    COUNTRIES: COUNTRIES, COUNTRY_LIST: COUNTRY_LIST, ALIAS_COUNTRY_LIST: ALIAS_COUNTRY_LIST,
    TRANSPORT: TRANSPORT, EV_RANGE_KM: EV_RANGE_KM, EV_CHARGE_MARGIN: EV_CHARGE_MARGIN,
    TOLL_RATE_BY_CLASS: TOLL_RATE_BY_CLASS, TOLL_RATE_BY_COUNTRY: TOLL_RATE_BY_COUNTRY,
    TOLL_MIN_DISTANCE_KM: TOLL_MIN_DISTANCE_KM,
    HR_ISLAND_POSTCODES: HR_ISLAND_POSTCODES, HR_POSTCODE_TO_ISLAND: HR_POSTCODE_TO_ISLAND,
    WADDEN_ISLANDS: WADDEN_ISLANDS, SARDINIA_PROVINCES: SARDINIA_PROVINCES, SICILY_PROVINCES: SICILY_PROVINCES,
    GR_POROS_MAINLAND_NAMES: GR_POROS_MAINLAND_NAMES, GR_ISLAND_PATTERNS: GR_ISLAND_PATTERNS,
    FERRY_ROUTES: FERRY_ROUTES, BUDGET_PRICE_MAX: BUDGET_PRICE_MAX
  };
});
