// Gestion multilingue de l'interface (fr/en/es/pt/nl/de pour l'instant, d'autres viendront —
// voir la recherche dans le sélecteur, prévue pour une liste plus longue). Indépendant de app.js
// (chargé avant lui, comme theme.js) : expose window.I18N = { t, tl, current, set, SUPPORTED,
// LANG_NAMES }, applique les traductions aux éléments [data-i18n-*] au chargement, construit le
// sélecteur de langue (bouton + liste cherchable, à côté du bouton de thème), et diffuse un
// événement 'i18n:langchange' sur window à chaque changement — app.js s'y abonne pour retraduire
// son propre contenu généré dynamiquement (placeholder de ville, horloge, itinéraire déjà affiché).
//
// Un seul fichier de traductions par langue, à plat (pas de nested objects) : plus simple à
// parcourir/differ qu'une arborescence, et le seul besoin réel ici est `t('un.identifiant.plat')`.
// Les valeurs listes (items du sac à préparer, activités génériques...) vivent dans LISTS, à part,
// pour ne pas mélanger deux formes de valeurs (chaîne vs tableau) dans le même objet.
(function(){
  "use strict";

  var SUPPORTED = ['fr', 'en', 'es', 'pt', 'nl', 'de'];
  var LANG_NAMES = { fr: 'Français', en: 'English', es: 'Español', pt: 'Português', nl: 'Nederlands', de: 'Deutsch' };
  var STORAGE_KEY = 'lang';

  var STRINGS = {
    fr: {
      'lang.buttonLabel': 'Langue',
      'lang.searchPlaceholder': 'Rechercher une langue…',
      'lang.searchNoResults': 'Aucune langue trouvée.',

      'hero.eyebrow': 'Générateur de road trip mystère',
      'hero.title': "Cap sur l'inconnu",
      'hero.subtitle': "votre prochaine escapade n'a pas encore de nom",
      'hero.lede': "Renseignez votre point de départ et vos contraintes. La machine tire au sort un itinéraire réel jour par jour — jusqu'à {maxDays} jours et {maxStops} villes — parmi les communes de France, d'Andorre, d'Espagne, du Portugal, de Belgique et des Pays-Bas, et une liste à emporter, le tout dans votre budget.",
      'hero.disclaimer': "Communes, distances, péages et points d'intérêt reposent sur des données officielles (IGN/GeoNames, guides tarifaires des sociétés d'autoroutes, OpenStreetMap). Les temps de trajet et prix restent des estimations — vérifiez toujours l'itinéraire réel et la disponibilité des hébergements avant de partir.",

      'form.heading': 'Feuille de route',
      'form.clockPlaceholder': '— à remplir —',
      'form.city.label': 'Ville de départ',
      'form.city.loadingPlaceholder': 'Chargement des communes…',
      'form.city.placeholder': 'Ex. {name} ou {cp}',
      'form.city.error.required': "Merci d'indiquer une ville de départ.",
      'form.city.error.selectFromList': 'Sélectionnez une commune dans la liste déroulante (recherche par nom ou code postal).',
      'form.dates.label': 'Dates du séjour',
      'form.dates.arrivalAria': "Date d'arrivée",
      'form.dates.returnAria': 'Date de retour',
      'form.dates.error': 'La date de retour doit être le même jour ou après la date d\'arrivée.',
      'form.dates.oneDay': '1 jour (aller-retour, sans nuitée)',
      'form.dates.duration1': '{days} jours (1 nuit)',
      'form.dates.durationN': '{days} jours ({nights} nuits)',
      'form.dates.maxSuffix': ' — {max} jours max',
      'form.dates.placeholder': '—',
      'form.budget.label': 'Budget global',
      'form.budget.economique': 'Économique',
      'form.budget.moyen': 'Moyen',
      'form.budget.confortable': 'Confortable',
      'form.budget.hint': "Jusqu'à {max} € / nuit (indicatif, 2 adultes) — utilisé pour préremplir les recherches Airbnb/Booking.",
      'form.transport.label': 'Mode de transport',
      'form.transport.voitureThermique': 'Voiture (thermique)',
      'form.transport.voitureHybride': 'Voiture hybride',
      'form.transport.voitureElectrique': 'Voiture électrique',
      'form.transport.van': 'Van aménagé',
      'form.transport.moto': 'Moto',
      'form.transport.velo': 'Vélo / bikepacking',
      'form.toll.label': 'Autoroutes à péage autorisées',
      'form.ferry.label': 'Traversées en ferry autorisées (îles)',
      'form.ferry.hint': 'Coché : le tirage peut inclure la Corse, les Baléares, les Canaries ou les îles Wadden, reliées par une vraie ligne de ferry (jamais par avion).',
      'form.tent.label': 'Éviter le bivouac et la nuit sous tente',
      'form.tent.hint': 'Coché : les nuitées à la belle étoile en budget économique sont remplacées par une formule cabane/yourte/gîte.',
      'form.radius.label': 'Limite de rayon',
      'form.radius.modeKm': 'Distance max (km)',
      'form.radius.modeH': 'Temps de trajet retour max (h)',
      'form.radius.groupAria': 'Type de limite',
      'form.radius.decAria': 'Diminuer',
      'form.radius.incAria': 'Augmenter',
      'form.radius.unitKm': 'km autour du départ',
      'form.radius.unitH': 'de trajet retour max',
      'form.radius.hint': "S'applique uniquement au {strong} (le retour)",
      'form.radius.hintStrong': 'dernier trajet',
      'form.minDistance.label': "Distance d'éloignement (optionnel)",
      'form.minDistance.minPlaceholder': 'Aucun minimum',
      'form.minDistance.maxPlaceholder': 'Aucun maximum',
      'form.minDistance.unitMin': 'km au moins',
      'form.minDistance.unitMax': 'km au maximum',
      'form.minDistance.hintMin': 'Minimum : la première étape sera à au moins cette distance.',
      'form.minDistance.hintMax': 'Maximum : le trajet ne dépassera jamais cette distance du point de départ, à aucun moment du séjour.',
      'form.launch.button': 'Lancer le générateur de road trip aléatoire',
      'form.launch.hint': 'Une destination secrète vous attend.',

      'reveal.drawing': 'Tirage en cours…',
      'reveal.clueIdle': 'La route va parler.',
      'reveal.clueSpinning': 'Direction inconnue…',
      'reveal.clueFinal': 'Voici votre point de départ mystère.',
      'reveal.clueReduced': 'Un vrai lieu vous attend.',
      'reveal.confirmed': 'Destination tirée au sort',
      'reveal.stamp': 'Destination confirmée',
      'reveal.inhabitants': '{n} habitants',
      'reveal.poi1': "1 point d'intérêt réel repéré",
      'reveal.poiN': "{n} points d'intérêt réels repérés",

      'map.title': 'Carte du parcours',
      'map.note': "Fond de carte OpenStreetMap. Points positionnés aux coordonnées réelles des communes — le tracé relie les étapes à vol d'oiseau, la route suivie serpente davantage.",
      'map.ariaLabel': 'Carte du trajet, fond OpenStreetMap',
      'map.departFallback': 'Départ',
      'map.returnLabel': 'retour',

      'timeline.title': 'Journal de bord',
      'stats.days': 'jours',
      'stats.cities': 'villes',
      'stats.nights': 'nuitées',
      'stats.totalKm': 'au total',
      'stats.tollEstimated': 'de péage estimé',
      'stats.tollAvoided': 'de péage évités',
      'stats.ferryTotal': 'de ferry',

      'day.single': 'Jour unique — aller-retour mystère',
      'day.return': 'Retour',
      'day.n': 'Jour {n}',
      'day.nReturn': 'Jour {n} — retour',
      'day.rangeAnd': 'Jours {a} et {b}',
      'day.rangeTo': 'Jours {a} à {b}',
      'day.routeTime': '~ {time} de route · {km} km',
      'day.crossingTime': '~ {time} de traversée · {km} km',
      'day.stepMystery': 'Étape mystère : {stop}',
      'day.returnTo': 'Retour vers {stop}',

      'photo.view': 'Voir {name} en photo',
      'photo.searching': "Recherche d'une vraie photo…",
      'photo.real': 'Photo réelle · © Wikimedia Commons',
      'photo.none': 'Aucune photo trouvée sur Wikipédia pour ce lieu',
      'photo.unavailable': "Image indisponible — recherche d'images en direct",
      'photo.enlargeAria': 'Agrandir la photo de {name}',
      'photo.closeAria': 'Fermer la photo',
      'wiki.link': 'Wikipédia ↗',

      'ferry.label': 'Traversée en ferry',
      'ferry.text': '{route} — environ {amount} € · {duration} de traversée.',
      'ferry.route.corsica': 'Continent ↔ Corse',
      'ferry.route.balearic': 'Continent ↔ Baléares',
      'ferry.route.canary': 'Continent ↔ Canaries',
      'ferry.route.wadden': 'Continent ↔ îles Wadden',
      'toll.label': 'Péage (barème ASF 2026)',
      'toll.barrierFree': 'péage à flux libre, sans barrière (facturation automatique par caméra)',
      'toll.barrierClassic': 'péage classique avec barrière',
      'toll.enabled': 'Péage estimé : ~{amount} € ({barrier}) — vous gagnez environ {min} min par rapport à un trajet sans péage.',
      'toll.disabled': 'Sans péage (option décochée) : vous auriez pu gagner environ {min} min en autoroute (~{amount} €, {barrier}).',

      'charge.label': 'Recharge électrique',
      'charge.text1': '1 pause recharge estimée (~{min} min au total) sur borne rapide.',
      'charge.textN': '{n} pauses recharge estimées (~{min} min au total) sur borne rapide.',

      'activities.choice': 'Activités possibles — au choix',
      'activities.day': 'Activités possibles — Jour {n}',
      'activities.loadingReal': '— recherche de vraies activités locales…',
      'activities.loadingHike': "— recherche d'une vraie randonnée…",

      'poiType.attraction': 'curiosité locale',
      'poiType.museum': 'musée',
      'poiType.viewpoint': 'point de vue',
      'poiType.castle': 'château',
      'poiType.gallery': 'galerie',
      'poiType.zoo': 'parc animalier',
      'poiType.theme_park': "parc d'attractions",
      'poiType.monument': 'monument',
      'poiType.memorial': 'mémorial',
      'poiType.archaeological_site': 'site archéologique',
      'poiType.cave_entrance': 'grotte',
      'poiType.ruins': 'ruines',
      'poiType.fort': 'fort',
      'poiType.citadel': 'citadelle',
      'poiType.manor': 'manoir',
      'poiType.chapel': 'chapelle',
      'poiType.place_of_worship': 'édifice religieux',
      'poiType.nature_reserve': 'réserve naturelle',
      'poiType.peak': 'sommet',
      'poiType.waterfall': 'cascade',
      'poiType.beach': 'plage',
      'poiType.artwork': "œuvre d'art",
      'poiType.fallback': 'curiosité locale',
      'poiType.walkFallback': 'balade',
      'poiType.generic': 'à faire sur place',

      'generic.walk': 'Randonnée ou balade dans les environs',
      'generic.market': 'Marché local et produits du terroir (jours à vérifier sur place)',
      'generic.church': "Visite de l'église ou du patrimoine bâti local",
      'generic.stroll': 'Flânerie dans le centre historique',
      'generic.producer': "Découverte d'un producteur ou artisan local",

      'hike.sourceLabel': 'Source : Visorando ↗',
      'hike.defaultType': 'randonnée balisée',

      'lodging.find': 'Trouver un logement · {range}',
      'lodging.airbnb': 'Airbnb ↗',
      'lodging.booking': 'Booking.com ↗',
      'lodging.economiqueTent': 'Camping, bivouac ou aire naturelle (petit budget)',
      'lodging.economiqueNoTent': 'Auberge, chambre simple ou petit hôtel (bivouac évité)',
      'lodging.moyen': "Gîte, chambre d'hôtes ou hôtel 2-3★",
      'lodging.confortable': 'Hôtel de charme ou location haut de gamme',

      'end.label': 'Fin de mission',
      'end.text': 'Retour à la maison, road trip mystère bouclé.',

      'export.hint': 'Ce roadtrip vous tente ? Pensez à le télécharger, il ne sera probablement jamais reproposé.',
      'export.button': 'Exporter cet itinéraire en PDF',
      'export.generating': 'Génération du PDF…',
      'export.error': 'Échec de la génération du PDF — réessayez dans un instant.',

      'pack.title': 'Sac à préparer',
      'pack.subDefault': "L'indispensable pour cette mission mystère",
      'pack.sub': 'Pour {transport}, budget {budget}.',

      'again.button': 'Retirer une autre destination',

      'footer.text': "Cap sur l'inconnu — générateur ludique, aucune donnée n'est envoyée où que ce soit. Communes : IGN / geo.api.gouv.fr (Etalab) pour la France, GeoNames (licence CC-BY) pour l'Andorre, l'Espagne, le Portugal, la Belgique et les Pays-Bas. Points d'intérêt et fond de carte : © les contributeurs d'OpenStreetMap (licence ODbL). Péages : VINCI Autoroutes (France), Autopistas (Espagne), Via Verde/Ascendi (Portugal) — autoroutes gratuites en Belgique, en Andorre et aux Pays-Bas.",
      'footer.legalMentions': 'Mentions légales',
      'footer.privacyPolicy': 'Politique de confidentialité',

      'error.loadData': 'Impossible de charger les données ({msg}). Vérifiez que le serveur sert bien le dossier public/data.',
      'error.routeImpossible': "Impossible de construire un itinéraire depuis cette ville pour l'instant — réessayez, ou élargissez le rayon.",
      'error.minMaxDistance': 'La distance minimale ({min} km) ne peut pas dépasser la distance maximale ({max} km).',
      'error.minDistanceContextDay': '1 jour et aucune nuitée',
      'error.minDistanceContextNight': '1 nuitée',
      'error.minDistanceTooFar': "Impossible : avec seulement {context}, on ne peut pas s'éloigner d'au moins {min} km puis revenir dans le rayon/temps de retour choisi ({radius} km). Augmentez la durée du séjour, réduisez la distance minimale, ou élargissez le rayon max.",

      'transport.voitureThermique.label': 'voiture',
      'transport.voitureHybride.label': 'voiture hybride',
      'transport.voitureElectrique.label': 'voiture électrique',
      'transport.van.label': 'van',
      'transport.moto.label': 'moto',
      'transport.velo.label': 'vélo'
    },

    en: {
      'lang.buttonLabel': 'Language',
      'lang.searchPlaceholder': 'Search a language…',
      'lang.searchNoResults': 'No language found.',

      'hero.eyebrow': 'Mystery road trip generator',
      'hero.title': 'Cap on the unknown',
      'hero.subtitle': "your next getaway doesn't have a name yet",
      'hero.lede': "Enter your starting point and constraints. The machine randomly draws a real day-by-day itinerary — up to {maxDays} days and {maxStops} towns — among the towns of France, Andorra, Spain, Portugal, Belgium and the Netherlands, plus a packing list, all within your budget.",
      'hero.disclaimer': "Towns, distances, tolls and points of interest are based on official data (IGN/GeoNames, motorway operators' rate guides, OpenStreetMap). Travel times and prices remain estimates — always double-check the real itinerary and accommodation availability before you leave.",

      'form.heading': 'Trip sheet',
      'form.clockPlaceholder': '— to fill in —',
      'form.city.label': 'Starting town',
      'form.city.loadingPlaceholder': 'Loading towns…',
      'form.city.placeholder': 'E.g. {name} or {cp}',
      'form.city.error.required': 'Please enter a starting town.',
      'form.city.error.selectFromList': 'Pick a town from the dropdown list (search by name or postal code).',
      'form.dates.label': 'Trip dates',
      'form.dates.arrivalAria': 'Start date',
      'form.dates.returnAria': 'Return date',
      'form.dates.error': 'The return date must be the same day as, or after, the start date.',
      'form.dates.oneDay': '1 day (round trip, no overnight stay)',
      'form.dates.duration1': '{days} days (1 night)',
      'form.dates.durationN': '{days} days ({nights} nights)',
      'form.dates.maxSuffix': ' — {max} days max',
      'form.dates.placeholder': '—',
      'form.budget.label': 'Overall budget',
      'form.budget.economique': 'Budget',
      'form.budget.moyen': 'Mid-range',
      'form.budget.confortable': 'Comfort',
      'form.budget.hint': 'Up to €{max} / night (indicative, 2 adults) — used to prefill Airbnb/Booking searches.',
      'form.transport.label': 'Mode of transport',
      'form.transport.voitureThermique': 'Car (petrol/diesel)',
      'form.transport.voitureHybride': 'Hybrid car',
      'form.transport.voitureElectrique': 'Electric car',
      'form.transport.van': 'Campervan',
      'form.transport.moto': 'Motorbike',
      'form.transport.velo': 'Bike / bikepacking',
      'form.toll.label': 'Toll motorways allowed',
      'form.ferry.label': 'Ferry crossings allowed (islands)',
      'form.ferry.hint': 'Checked: the draw can include Corsica, the Balearic Islands, the Canary Islands or the Wadden Islands, connected by a real ferry line (never by plane).',
      'form.tent.label': 'Avoid wild camping / tent nights',
      'form.tent.hint': 'Checked: budget-tier wild-camping nights are replaced with a cabin/yurt/gîte stay.',
      'form.radius.label': 'Radius limit',
      'form.radius.modeKm': 'Max distance (km)',
      'form.radius.modeH': 'Max return travel time (h)',
      'form.radius.groupAria': 'Limit type',
      'form.radius.decAria': 'Decrease',
      'form.radius.incAria': 'Increase',
      'form.radius.unitKm': 'km from the starting point',
      'form.radius.unitH': 'of return travel',
      'form.radius.hint': 'Only applies to the {strong} (the way back)',
      'form.radius.hintStrong': 'last leg',
      'form.minDistance.label': 'Distance from home (optional)',
      'form.minDistance.minPlaceholder': 'No minimum',
      'form.minDistance.maxPlaceholder': 'No maximum',
      'form.minDistance.unitMin': 'km at least',
      'form.minDistance.unitMax': 'km at most',
      'form.minDistance.hintMin': 'Minimum: the first stop will be at least this far away.',
      'form.minDistance.hintMax': 'Maximum: the trip will never exceed this distance from the starting point, at any point during the stay.',
      'form.launch.button': 'Launch the random road trip generator',
      'form.launch.hint': 'A secret destination awaits you.',

      'reveal.drawing': 'Drawing in progress…',
      'reveal.clueIdle': 'The road is about to speak.',
      'reveal.clueSpinning': 'Unknown direction…',
      'reveal.clueFinal': 'Here is your mystery starting point.',
      'reveal.clueReduced': 'A real place awaits you.',
      'reveal.confirmed': 'Destination drawn',
      'reveal.stamp': 'Destination confirmed',
      'reveal.inhabitants': '{n} inhabitants',
      'reveal.poi1': '1 real point of interest spotted',
      'reveal.poiN': '{n} real points of interest spotted',

      'map.title': 'Route map',
      'map.note': "OpenStreetMap background. Points are placed at the real coordinates of the towns — the line connects the stops as the crow flies, the actual route winds more.",
      'map.ariaLabel': 'Route map, OpenStreetMap background',
      'map.departFallback': 'Start',
      'map.returnLabel': 'return',

      'timeline.title': 'Trip log',
      'stats.days': 'days',
      'stats.cities': 'towns',
      'stats.nights': 'nights',
      'stats.totalKm': 'total',
      'stats.tollEstimated': 'estimated tolls',
      'stats.tollAvoided': 'tolls avoided',
      'stats.ferryTotal': 'ferry',

      'day.single': 'Single day — mystery round trip',
      'day.return': 'Return',
      'day.n': 'Day {n}',
      'day.nReturn': 'Day {n} — return',
      'day.rangeAnd': 'Days {a} and {b}',
      'day.rangeTo': 'Days {a} to {b}',
      'day.routeTime': '~ {time} on the road · {km} km',
      'day.crossingTime': '~ {time} crossing · {km} km',
      'day.stepMystery': 'Mystery stop: {stop}',
      'day.returnTo': 'Return to {stop}',

      'photo.view': 'See a photo of {name}',
      'photo.searching': 'Looking for a real photo…',
      'photo.real': 'Real photo · © Wikimedia Commons',
      'photo.none': 'No photo found on Wikipedia for this place',
      'photo.unavailable': 'Image unavailable — searching for images online',
      'photo.enlargeAria': 'Enlarge the photo of {name}',
      'photo.closeAria': 'Close the photo',
      'wiki.link': 'Wikipedia ↗',

      'ferry.label': 'Ferry crossing',
      'ferry.text': '{route} — about €{amount} · {duration} crossing.',
      'ferry.route.corsica': 'Mainland ↔ Corsica',
      'ferry.route.balearic': 'Mainland ↔ Balearic Islands',
      'ferry.route.canary': 'Mainland ↔ Canary Islands',
      'ferry.route.wadden': 'Mainland ↔ Wadden Islands',
      'toll.label': 'Toll (ASF 2026 rate guide)',
      'toll.barrierFree': 'free-flow toll, no barrier (automatic camera billing)',
      'toll.barrierClassic': 'classic barrier toll',
      'toll.enabled': 'Estimated toll: ~€{amount} ({barrier}) — you save about {min} min compared to a toll-free route.',
      'toll.disabled': 'No toll (option unchecked): you could have saved about {min} min on the motorway (~€{amount}, {barrier}).',

      'charge.label': 'Electric charging',
      'charge.text1': '1 estimated charging stop (~{min} min total) at a fast charger.',
      'charge.textN': '{n} estimated charging stops (~{min} min total) at fast chargers.',

      'activities.choice': 'Possible activities — your choice',
      'activities.day': 'Possible activities — Day {n}',
      'activities.loadingReal': '— looking for real local activities…',
      'activities.loadingHike': '— looking for a real hiking trail…',

      'poiType.attraction': 'local landmark',
      'poiType.museum': 'museum',
      'poiType.viewpoint': 'viewpoint',
      'poiType.castle': 'castle',
      'poiType.gallery': 'gallery',
      'poiType.zoo': 'animal park',
      'poiType.theme_park': 'theme park',
      'poiType.monument': 'monument',
      'poiType.memorial': 'memorial',
      'poiType.archaeological_site': 'archaeological site',
      'poiType.cave_entrance': 'cave',
      'poiType.ruins': 'ruins',
      'poiType.fort': 'fort',
      'poiType.citadel': 'citadel',
      'poiType.manor': 'manor',
      'poiType.chapel': 'chapel',
      'poiType.place_of_worship': 'place of worship',
      'poiType.nature_reserve': 'nature reserve',
      'poiType.peak': 'peak',
      'poiType.waterfall': 'waterfall',
      'poiType.beach': 'beach',
      'poiType.artwork': 'artwork',
      'poiType.fallback': 'local landmark',
      'poiType.walkFallback': 'walk',
      'poiType.generic': 'to do on site',

      'generic.walk': 'Hike or walk in the surrounding area',
      'generic.market': 'Local market and regional produce (check days on site)',
      'generic.church': 'Visit the church or local built heritage',
      'generic.stroll': 'Stroll through the historic centre',
      'generic.producer': 'Discover a local producer or craftsperson',

      'hike.sourceLabel': 'Source: Visorando ↗',
      'hike.defaultType': 'waymarked hike',

      'lodging.find': 'Find a place to stay · {range}',
      'lodging.airbnb': 'Airbnb ↗',
      'lodging.booking': 'Booking.com ↗',
      'lodging.economiqueTent': 'Campsite, wild camping or natural area (low budget)',
      'lodging.economiqueNoTent': 'Hostel, simple room or small hotel (wild camping avoided)',
      'lodging.moyen': 'Gîte, guesthouse or 2-3★ hotel',
      'lodging.confortable': 'Boutique hotel or upscale rental',

      'end.label': 'Mission complete',
      'end.text': 'Back home, mystery road trip wrapped up.',

      'export.hint': 'Tempted by this road trip? Remember to download it, it will probably never come up again.',
      'export.button': 'Export this itinerary as PDF',
      'export.generating': 'Generating PDF…',
      'export.error': 'PDF generation failed — try again in a moment.',

      'pack.title': 'Bag to pack',
      'pack.subDefault': 'The essentials for this mystery mission',
      'pack.sub': 'For {transport}, {budget} budget.',

      'again.button': 'Draw another destination',

      'footer.text': "Cap on the unknown — a playful generator, no data is ever sent anywhere. Towns: IGN / geo.api.gouv.fr (Etalab) for France, GeoNames (CC-BY licence) for Andorra, Spain, Portugal, Belgium and the Netherlands. Points of interest and map background: © OpenStreetMap contributors (ODbL licence). Tolls: VINCI Autoroutes (France), Autopistas (Spain), Via Verde/Ascendi (Portugal) — free motorways in Belgium, Andorra and the Netherlands.",
      'footer.legalMentions': 'Legal notice',
      'footer.privacyPolicy': 'Privacy policy',

      'error.loadData': 'Could not load the data ({msg}). Check that the server is serving the public/data folder.',
      'error.routeImpossible': "Couldn't build an itinerary from this town right now — try again, or widen the radius.",
      'error.minMaxDistance': 'The minimum distance ({min} km) cannot exceed the maximum distance ({max} km).',
      'error.minDistanceContextDay': '1 day and no overnight stay',
      'error.minDistanceContextNight': '1 night',
      'error.minDistanceTooFar': "Not possible: with only {context}, you can't get at least {min} km away and still come back within the chosen return radius/time ({radius} km). Increase the trip length, lower the minimum distance, or widen the max radius.",

      'transport.voitureThermique.label': 'car',
      'transport.voitureHybride.label': 'hybrid car',
      'transport.voitureElectrique.label': 'electric car',
      'transport.van.label': 'campervan',
      'transport.moto.label': 'motorbike',
      'transport.velo.label': 'bike'
    },

    es: {
      'lang.buttonLabel': 'Idioma',
      'lang.searchPlaceholder': 'Buscar un idioma…',
      'lang.searchNoResults': 'No se ha encontrado ningún idioma.',

      'hero.eyebrow': 'Generador de road trips misteriosos',
      'hero.title': 'Rumbo a lo desconocido',
      'hero.subtitle': 'tu próxima escapada todavía no tiene nombre',
      'hero.lede': "Indica tu punto de partida y tus condiciones. La máquina sortea un itinerario real día a día — hasta {maxDays} días y {maxStops} ciudades — entre los municipios de Francia, Andorra, España, Portugal, Bélgica y los Países Bajos, además de una lista de equipaje, todo dentro de tu presupuesto.",
      'hero.disclaimer': 'Los municipios, distancias, peajes y puntos de interés se basan en datos oficiales (IGN/GeoNames, guías de tarifas de las autopistas, OpenStreetMap). Los tiempos de trayecto y precios son estimaciones — comprueba siempre el itinerario real y la disponibilidad de alojamiento antes de partir.',

      'form.heading': 'Hoja de ruta',
      'form.clockPlaceholder': '— por completar —',
      'form.city.label': 'Ciudad de salida',
      'form.city.loadingPlaceholder': 'Cargando municipios…',
      'form.city.placeholder': 'Ej. {name} o {cp}',
      'form.city.error.required': 'Indica una ciudad de salida.',
      'form.city.error.selectFromList': 'Selecciona un municipio de la lista desplegable (búsqueda por nombre o código postal).',
      'form.dates.label': 'Fechas de la estancia',
      'form.dates.arrivalAria': 'Fecha de llegada',
      'form.dates.returnAria': 'Fecha de vuelta',
      'form.dates.error': 'La fecha de vuelta debe ser el mismo día que la de llegada, o posterior.',
      'form.dates.oneDay': '1 día (ida y vuelta, sin pernoctar)',
      'form.dates.duration1': '{days} días (1 noche)',
      'form.dates.durationN': '{days} días ({nights} noches)',
      'form.dates.maxSuffix': ' — máximo {max} días',
      'form.dates.placeholder': '—',
      'form.budget.label': 'Presupuesto global',
      'form.budget.economique': 'Económico',
      'form.budget.moyen': 'Medio',
      'form.budget.confortable': 'Confort',
      'form.budget.hint': 'Hasta {max} € / noche (orientativo, 2 adultos) — se usa para rellenar las búsquedas en Airbnb/Booking.',
      'form.transport.label': 'Medio de transporte',
      'form.transport.voitureThermique': 'Coche (térmico)',
      'form.transport.voitureHybride': 'Coche híbrido',
      'form.transport.voitureElectrique': 'Coche eléctrico',
      'form.transport.van': 'Furgoneta camperizada',
      'form.transport.moto': 'Moto',
      'form.transport.velo': 'Bicicleta / bikepacking',
      'form.toll.label': 'Autopistas de peaje permitidas',
      'form.ferry.label': 'Travesías en ferry permitidas (islas)',
      'form.ferry.hint': 'Marcado: el sorteo puede incluir Córcega, las Baleares, las Canarias o las islas Frisias, unidas por una línea de ferry real (nunca en avión).',
      'form.tent.label': 'Evitar la acampada libre y dormir en tienda',
      'form.tent.hint': 'Marcado: las noches a la intemperie en presupuesto económico se sustituyen por una opción de cabaña/yurta/casa rural.',
      'form.radius.label': 'Límite de radio',
      'form.radius.modeKm': 'Distancia máx. (km)',
      'form.radius.modeH': 'Tiempo de vuelta máx. (h)',
      'form.radius.groupAria': 'Tipo de límite',
      'form.radius.decAria': 'Disminuir',
      'form.radius.incAria': 'Aumentar',
      'form.radius.unitKm': 'km desde la salida',
      'form.radius.unitH': 'de trayecto de vuelta',
      'form.radius.hint': 'Solo se aplica al {strong} (la vuelta)',
      'form.radius.hintStrong': 'último trayecto',
      'form.minDistance.label': 'Distancia de alejamiento (opcional)',
      'form.minDistance.minPlaceholder': 'Sin mínimo',
      'form.minDistance.maxPlaceholder': 'Sin máximo',
      'form.minDistance.unitMin': 'km como mínimo',
      'form.minDistance.unitMax': 'km como máximo',
      'form.minDistance.hintMin': 'Mínimo: la primera etapa estará al menos a esta distancia.',
      'form.minDistance.hintMax': 'Máximo: el trayecto nunca superará esta distancia respecto al punto de salida, en ningún momento de la estancia.',
      'form.launch.button': 'Lanzar el generador de road trip aleatorio',
      'form.launch.hint': 'Un destino secreto te espera.',

      'reveal.drawing': 'Sorteo en curso…',
      'reveal.clueIdle': 'La carretera va a hablar.',
      'reveal.clueSpinning': 'Dirección desconocida…',
      'reveal.clueFinal': 'Aquí tienes tu punto de partida misterioso.',
      'reveal.clueReduced': 'Un lugar real te espera.',
      'reveal.confirmed': 'Destino sorteado',
      'reveal.stamp': 'Destino confirmado',
      'reveal.inhabitants': '{n} habitantes',
      'reveal.poi1': '1 punto de interés real localizado',
      'reveal.poiN': '{n} puntos de interés reales localizados',

      'map.title': 'Mapa del recorrido',
      'map.note': 'Fondo de mapa OpenStreetMap. Los puntos se sitúan en las coordenadas reales de los municipios — la línea une las etapas en línea recta, la ruta real serpentea más.',
      'map.ariaLabel': 'Mapa del recorrido, fondo OpenStreetMap',
      'map.departFallback': 'Salida',
      'map.returnLabel': 'vuelta',

      'timeline.title': 'Diario de a bordo',
      'stats.days': 'días',
      'stats.cities': 'ciudades',
      'stats.nights': 'noches',
      'stats.totalKm': 'en total',
      'stats.tollEstimated': 'de peaje estimado',
      'stats.tollAvoided': 'de peaje evitado',
      'stats.ferryTotal': 'de ferry',

      'day.single': 'Día único — ida y vuelta misteriosa',
      'day.return': 'Vuelta',
      'day.n': 'Día {n}',
      'day.nReturn': 'Día {n} — vuelta',
      'day.rangeAnd': 'Días {a} y {b}',
      'day.rangeTo': 'Días {a} a {b}',
      'day.routeTime': '~ {time} de trayecto · {km} km',
      'day.crossingTime': '~ {time} de travesía · {km} km',
      'day.stepMystery': 'Etapa misteriosa: {stop}',
      'day.returnTo': 'Vuelta hacia {stop}',

      'photo.view': 'Ver una foto de {name}',
      'photo.searching': 'Buscando una foto real…',
      'photo.real': 'Foto real · © Wikimedia Commons',
      'photo.none': 'No se ha encontrado ninguna foto en Wikipedia para este lugar',
      'photo.unavailable': 'Imagen no disponible — buscando imágenes en directo',
      'photo.enlargeAria': 'Ampliar la foto de {name}',
      'photo.closeAria': 'Cerrar la foto',
      'wiki.link': 'Wikipedia ↗',

      'ferry.label': 'Travesía en ferry',
      'ferry.text': '{route} — unos {amount} € · {duration} de travesía.',
      'ferry.route.corsica': 'Continente ↔ Córcega',
      'ferry.route.balearic': 'Continente ↔ Baleares',
      'ferry.route.canary': 'Continente ↔ Canarias',
      'ferry.route.wadden': 'Continente ↔ islas Frisias',
      'toll.label': 'Peaje (tarifa ASF 2026)',
      'toll.barrierFree': 'peaje de flujo libre, sin barrera (cobro automático por cámara)',
      'toll.barrierClassic': 'peaje clásico con barrera',
      'toll.enabled': 'Peaje estimado: ~{amount} € ({barrier}) — ahorras unos {min} min respecto a un trayecto sin peaje.',
      'toll.disabled': 'Sin peaje (opción desmarcada): podrías haber ahorrado unos {min} min por autopista (~{amount} €, {barrier}).',

      'charge.label': 'Recarga eléctrica',
      'charge.text1': '1 parada de recarga estimada (~{min} min en total) en un cargador rápido.',
      'charge.textN': '{n} paradas de recarga estimadas (~{min} min en total) en cargadores rápidos.',

      'activities.choice': 'Actividades posibles — a elegir',
      'activities.day': 'Actividades posibles — Día {n}',
      'activities.loadingReal': '— buscando actividades locales reales…',
      'activities.loadingHike': '— buscando una ruta de senderismo real…',

      'poiType.attraction': 'curiosidad local',
      'poiType.museum': 'museo',
      'poiType.viewpoint': 'mirador',
      'poiType.castle': 'castillo',
      'poiType.gallery': 'galería',
      'poiType.zoo': 'parque de animales',
      'poiType.theme_park': 'parque de atracciones',
      'poiType.monument': 'monumento',
      'poiType.memorial': 'memorial',
      'poiType.archaeological_site': 'yacimiento arqueológico',
      'poiType.cave_entrance': 'cueva',
      'poiType.ruins': 'ruinas',
      'poiType.fort': 'fuerte',
      'poiType.citadel': 'ciudadela',
      'poiType.manor': 'casa señorial',
      'poiType.chapel': 'capilla',
      'poiType.place_of_worship': 'edificio religioso',
      'poiType.nature_reserve': 'reserva natural',
      'poiType.peak': 'cima',
      'poiType.waterfall': 'cascada',
      'poiType.beach': 'playa',
      'poiType.artwork': 'obra de arte',
      'poiType.fallback': 'curiosidad local',
      'poiType.walkFallback': 'paseo',
      'poiType.generic': 'por hacer en el lugar',

      'generic.walk': 'Ruta de senderismo o paseo por los alrededores',
      'generic.market': 'Mercado local y productos de la zona (comprobar días en el sitio)',
      'generic.church': 'Visita a la iglesia o al patrimonio local',
      'generic.stroll': 'Paseo por el casco histórico',
      'generic.producer': 'Descubrir a un productor o artesano local',

      'hike.sourceLabel': 'Fuente: Visorando ↗',
      'hike.defaultType': 'ruta señalizada',

      'lodging.find': 'Buscar alojamiento · {range}',
      'lodging.airbnb': 'Airbnb ↗',
      'lodging.booking': 'Booking.com ↗',
      'lodging.economiqueTent': 'Camping, acampada libre o zona natural (bajo presupuesto)',
      'lodging.economiqueNoTent': 'Albergue, habitación sencilla u hotel pequeño (sin acampada libre)',
      'lodging.moyen': 'Casa rural, alojamiento con desayuno u hotel 2-3★',
      'lodging.confortable': 'Hotel con encanto o alquiler de gama alta',

      'end.label': 'Fin de la misión',
      'end.text': 'Vuelta a casa, road trip misterioso completado.',

      'export.hint': '¿Te tienta este road trip? Descárgalo, probablemente no se vuelva a proponer.',
      'export.button': 'Exportar este itinerario en PDF',
      'export.generating': 'Generando el PDF…',
      'export.error': 'Fallo al generar el PDF — inténtalo de nuevo en un momento.',

      'pack.title': 'Equipaje a preparar',
      'pack.subDefault': 'Lo imprescindible para esta misión misteriosa',
      'pack.sub': 'Para {transport}, presupuesto {budget}.',

      'again.button': 'Sortear otro destino',

      'footer.text': "Rumbo a lo desconocido — un generador lúdico, no se envía ningún dato a ningún sitio. Municipios: IGN / geo.api.gouv.fr (Etalab) para Francia, GeoNames (licencia CC-BY) para Andorra, España, Portugal, Bélgica y los Países Bajos. Puntos de interés y fondo de mapa: © colaboradores de OpenStreetMap (licencia ODbL). Peajes: VINCI Autoroutes (Francia), Autopistas (España), Via Verde/Ascendi (Portugal) — autopistas gratuitas en Bélgica, Andorra y los Países Bajos.",
      'footer.legalMentions': 'Aviso legal',
      'footer.privacyPolicy': 'Política de privacidad',

      'error.loadData': 'No se han podido cargar los datos ({msg}). Comprueba que el servidor sirve correctamente la carpeta public/data.',
      'error.routeImpossible': 'No se ha podido construir un itinerario desde esta ciudad por ahora — inténtalo de nuevo, o amplía el radio.',
      'error.minMaxDistance': 'La distancia mínima ({min} km) no puede superar la distancia máxima ({max} km).',
      'error.minDistanceContextDay': '1 día y ninguna pernoctación',
      'error.minDistanceContextNight': '1 pernoctación',
      'error.minDistanceTooFar': 'Imposible: con solo {context}, no es posible alejarse al menos {min} km y volver dentro del radio/tiempo de vuelta elegido ({radius} km). Aumenta la duración de la estancia, reduce la distancia mínima, o amplía el radio máximo.',

      'transport.voitureThermique.label': 'coche',
      'transport.voitureHybride.label': 'coche híbrido',
      'transport.voitureElectrique.label': 'coche eléctrico',
      'transport.van.label': 'furgoneta',
      'transport.moto.label': 'moto',
      'transport.velo.label': 'bicicleta'
    },

    pt: {
      'lang.buttonLabel': 'Idioma',
      'lang.searchPlaceholder': 'Pesquisar um idioma…',
      'lang.searchNoResults': 'Nenhum idioma encontrado.',

      'hero.eyebrow': 'Gerador de road trips misteriosos',
      'hero.title': 'Rumo ao desconhecido',
      'hero.subtitle': 'a sua próxima escapadela ainda não tem nome',
      'hero.lede': "Indique o seu ponto de partida e as suas condições. A máquina sorteia um itinerário real dia a dia — até {maxDays} dias e {maxStops} cidades — entre os municípios de França, Andorra, Espanha, Portugal, Bélgica e os Países Baixos, mais uma lista de bagagem, tudo dentro do seu orçamento.",
      'hero.disclaimer': 'Municípios, distâncias, portagens e pontos de interesse baseiam-se em dados oficiais (IGN/GeoNames, tabelas tarifárias das concessionárias de autoestradas, OpenStreetMap). Os tempos de viagem e preços são estimativas — verifique sempre o itinerário real e a disponibilidade de alojamento antes de partir.',

      'form.heading': 'Folha de rota',
      'form.clockPlaceholder': '— por preencher —',
      'form.city.label': 'Cidade de partida',
      'form.city.loadingPlaceholder': 'A carregar municípios…',
      'form.city.placeholder': 'Ex. {name} ou {cp}',
      'form.city.error.required': 'Indique uma cidade de partida.',
      'form.city.error.selectFromList': 'Selecione um município na lista pendente (pesquisa por nome ou código postal).',
      'form.dates.label': 'Datas da estadia',
      'form.dates.arrivalAria': 'Data de chegada',
      'form.dates.returnAria': 'Data de regresso',
      'form.dates.error': 'A data de regresso deve ser igual ou posterior à data de chegada.',
      'form.dates.oneDay': '1 dia (ida e volta, sem pernoita)',
      'form.dates.duration1': '{days} dias (1 noite)',
      'form.dates.durationN': '{days} dias ({nights} noites)',
      'form.dates.maxSuffix': ' — máximo {max} dias',
      'form.dates.placeholder': '—',
      'form.budget.label': 'Orçamento global',
      'form.budget.economique': 'Económico',
      'form.budget.moyen': 'Médio',
      'form.budget.confortable': 'Conforto',
      'form.budget.hint': 'Até {max} € / noite (indicativo, 2 adultos) — usado para pré-preencher as pesquisas no Airbnb/Booking.',
      'form.transport.label': 'Meio de transporte',
      'form.transport.voitureThermique': 'Carro (combustão)',
      'form.transport.voitureHybride': 'Carro híbrido',
      'form.transport.voitureElectrique': 'Carro elétrico',
      'form.transport.van': 'Autocaravana',
      'form.transport.moto': 'Mota',
      'form.transport.velo': 'Bicicleta / bikepacking',
      'form.toll.label': 'Autoestradas com portagem permitidas',
      'form.ferry.label': 'Travessias de ferry permitidas (ilhas)',
      'form.ferry.hint': 'Marcado: o sorteio pode incluir a Córsega, as Baleares, as Canárias ou as ilhas Frísias, ligadas por uma linha de ferry real (nunca de avião).',
      'form.tent.label': 'Evitar bivaque e dormir em tenda',
      'form.tent.hint': 'Marcado: as noites ao relento no orçamento económico são substituídas por uma opção de cabana/yurte/casa de campo.',
      'form.radius.label': 'Limite de raio',
      'form.radius.modeKm': 'Distância máx. (km)',
      'form.radius.modeH': 'Tempo de regresso máx. (h)',
      'form.radius.groupAria': 'Tipo de limite',
      'form.radius.decAria': 'Diminuir',
      'form.radius.incAria': 'Aumentar',
      'form.radius.unitKm': 'km a partir da partida',
      'form.radius.unitH': 'de viagem de regresso',
      'form.radius.hint': 'Aplica-se apenas ao {strong} (o regresso)',
      'form.radius.hintStrong': 'último trajeto',
      'form.minDistance.label': 'Distância de afastamento (opcional)',
      'form.minDistance.minPlaceholder': 'Sem mínimo',
      'form.minDistance.maxPlaceholder': 'Sem máximo',
      'form.minDistance.unitMin': 'km no mínimo',
      'form.minDistance.unitMax': 'km no máximo',
      'form.minDistance.hintMin': 'Mínimo: a primeira etapa estará pelo menos a esta distância.',
      'form.minDistance.hintMax': 'Máximo: o trajeto nunca ultrapassará esta distância do ponto de partida, em nenhum momento da estadia.',
      'form.launch.button': 'Lançar o gerador de road trip aleatório',
      'form.launch.hint': 'Um destino secreto espera por si.',

      'reveal.drawing': 'Sorteio em curso…',
      'reveal.clueIdle': 'A estrada vai falar.',
      'reveal.clueSpinning': 'Direção desconhecida…',
      'reveal.clueFinal': 'Aqui está o seu ponto de partida misterioso.',
      'reveal.clueReduced': 'Um lugar real espera por si.',
      'reveal.confirmed': 'Destino sorteado',
      'reveal.stamp': 'Destino confirmado',
      'reveal.inhabitants': '{n} habitantes',
      'reveal.poi1': '1 ponto de interesse real encontrado',
      'reveal.poiN': '{n} pontos de interesse reais encontrados',

      'map.title': 'Mapa do percurso',
      'map.note': 'Fundo de mapa OpenStreetMap. Os pontos são colocados nas coordenadas reais dos municípios — a linha liga as etapas em linha reta, a rota real serpenteia mais.',
      'map.ariaLabel': 'Mapa do percurso, fundo OpenStreetMap',
      'map.departFallback': 'Partida',
      'map.returnLabel': 'regresso',

      'timeline.title': 'Diário de bordo',
      'stats.days': 'dias',
      'stats.cities': 'cidades',
      'stats.nights': 'noites',
      'stats.totalKm': 'no total',
      'stats.tollEstimated': 'de portagem estimada',
      'stats.tollAvoided': 'de portagem evitada',
      'stats.ferryTotal': 'de ferry',

      'day.single': 'Dia único — ida e volta misteriosa',
      'day.return': 'Regresso',
      'day.n': 'Dia {n}',
      'day.nReturn': 'Dia {n} — regresso',
      'day.rangeAnd': 'Dias {a} e {b}',
      'day.rangeTo': 'Dias {a} a {b}',
      'day.routeTime': '~ {time} de viagem · {km} km',
      'day.crossingTime': '~ {time} de travessia · {km} km',
      'day.stepMystery': 'Etapa misteriosa: {stop}',
      'day.returnTo': 'Regresso a {stop}',

      'photo.view': 'Ver uma foto de {name}',
      'photo.searching': 'A procurar uma foto real…',
      'photo.real': 'Foto real · © Wikimedia Commons',
      'photo.none': 'Nenhuma foto encontrada na Wikipédia para este local',
      'photo.unavailable': 'Imagem indisponível — a procurar imagens em direto',
      'photo.enlargeAria': 'Ampliar a foto de {name}',
      'photo.closeAria': 'Fechar a foto',
      'wiki.link': 'Wikipédia ↗',

      'ferry.label': 'Travessia de ferry',
      'ferry.text': '{route} — cerca de {amount} € · {duration} de travessia.',
      'ferry.route.corsica': 'Continente ↔ Córsega',
      'ferry.route.balearic': 'Continente ↔ Baleares',
      'ferry.route.canary': 'Continente ↔ Canárias',
      'ferry.route.wadden': 'Continente ↔ ilhas Frísias',
      'toll.label': 'Portagem (tabela ASF 2026)',
      'toll.barrierFree': 'portagem de fluxo livre, sem barreira (cobrança automática por câmara)',
      'toll.barrierClassic': 'portagem clássica com barreira',
      'toll.enabled': 'Portagem estimada: ~{amount} € ({barrier}) — poupa cerca de {min} min em relação a um trajeto sem portagem.',
      'toll.disabled': 'Sem portagem (opção desmarcada): poderia ter poupado cerca de {min} min na autoestrada (~{amount} €, {barrier}).',

      'charge.label': 'Carregamento elétrico',
      'charge.text1': '1 paragem de carregamento estimada (~{min} min no total) num carregador rápido.',
      'charge.textN': '{n} paragens de carregamento estimadas (~{min} min no total) em carregadores rápidos.',

      'activities.choice': 'Atividades possíveis — à escolha',
      'activities.day': 'Atividades possíveis — Dia {n}',
      'activities.loadingReal': '— a procurar atividades locais reais…',
      'activities.loadingHike': '— a procurar um verdadeiro trilho pedestre…',

      'poiType.attraction': 'curiosidade local',
      'poiType.museum': 'museu',
      'poiType.viewpoint': 'miradouro',
      'poiType.castle': 'castelo',
      'poiType.gallery': 'galeria',
      'poiType.zoo': 'parque de animais',
      'poiType.theme_park': 'parque de diversões',
      'poiType.monument': 'monumento',
      'poiType.memorial': 'memorial',
      'poiType.archaeological_site': 'sítio arqueológico',
      'poiType.cave_entrance': 'gruta',
      'poiType.ruins': 'ruínas',
      'poiType.fort': 'forte',
      'poiType.citadel': 'cidadela',
      'poiType.manor': 'solar',
      'poiType.chapel': 'capela',
      'poiType.place_of_worship': 'edifício religioso',
      'poiType.nature_reserve': 'reserva natural',
      'poiType.peak': 'pico',
      'poiType.waterfall': 'cascata',
      'poiType.beach': 'praia',
      'poiType.artwork': 'obra de arte',
      'poiType.fallback': 'curiosidade local',
      'poiType.walkFallback': 'passeio',
      'poiType.generic': 'a fazer no local',

      'generic.walk': 'Caminhada ou passeio pelos arredores',
      'generic.market': 'Mercado local e produtos regionais (confirmar dias no local)',
      'generic.church': 'Visita à igreja ou ao património local',
      'generic.stroll': 'Passeio pelo centro histórico',
      'generic.producer': 'Descobrir um produtor ou artesão local',

      'hike.sourceLabel': 'Fonte: Visorando ↗',
      'hike.defaultType': 'trilho sinalizado',

      'lodging.find': 'Encontrar alojamento · {range}',
      'lodging.airbnb': 'Airbnb ↗',
      'lodging.booking': 'Booking.com ↗',
      'lodging.economiqueTent': 'Campismo, bivaque ou área natural (orçamento reduzido)',
      'lodging.economiqueNoTent': 'Pousada, quarto simples ou hotel pequeno (sem bivaque)',
      'lodging.moyen': 'Casa de campo, alojamento local ou hotel 2-3★',
      'lodging.confortable': 'Hotel com charme ou aluguer de gama alta',

      'end.label': 'Fim da missão',
      'end.text': 'De volta a casa, road trip misterioso concluído.',

      'export.hint': 'Interessado nesta road trip? Não se esqueça de a descarregar, provavelmente nunca mais será proposta.',
      'export.button': 'Exportar este itinerário em PDF',
      'export.generating': 'A gerar o PDF…',
      'export.error': 'Falha ao gerar o PDF — tente novamente dentro de instantes.',

      'pack.title': 'Mala a preparar',
      'pack.subDefault': 'O essencial para esta missão misteriosa',
      'pack.sub': 'Para {transport}, orçamento {budget}.',

      'again.button': 'Sortear outro destino',

      'footer.text': "Rumo ao desconhecido — um gerador lúdico, nenhum dado é enviado para lado nenhum. Municípios: IGN / geo.api.gouv.fr (Etalab) para França, GeoNames (licença CC-BY) para Andorra, Espanha, Portugal, Bélgica e os Países Baixos. Pontos de interesse e fundo de mapa: © colaboradores do OpenStreetMap (licença ODbL). Portagens: VINCI Autoroutes (França), Autopistas (Espanha), Via Verde/Ascendi (Portugal) — autoestradas gratuitas na Bélgica, em Andorra e nos Países Baixos.",
      'footer.legalMentions': 'Aviso legal',
      'footer.privacyPolicy': 'Política de privacidade',

      'error.loadData': 'Não foi possível carregar os dados ({msg}). Verifique se o servidor está a servir corretamente a pasta public/data.',
      'error.routeImpossible': 'Não foi possível construir um itinerário a partir desta cidade neste momento — tente novamente, ou alargue o raio.',
      'error.minMaxDistance': 'A distância mínima ({min} km) não pode ultrapassar a distância máxima ({max} km).',
      'error.minDistanceContextDay': '1 dia e nenhuma pernoita',
      'error.minDistanceContextNight': '1 pernoita',
      'error.minDistanceTooFar': 'Impossível: com apenas {context}, não é possível afastar-se pelo menos {min} km e regressar dentro do raio/tempo de regresso escolhido ({radius} km). Aumente a duração da estadia, reduza a distância mínima, ou alargue o raio máximo.',

      'transport.voitureThermique.label': 'carro',
      'transport.voitureHybride.label': 'carro híbrido',
      'transport.voitureElectrique.label': 'carro elétrico',
      'transport.van.label': 'autocaravana',
      'transport.moto.label': 'mota',
      'transport.velo.label': 'bicicleta'
    },

    nl: {
      'lang.buttonLabel': 'Taal',
      'lang.searchPlaceholder': 'Een taal zoeken…',
      'lang.searchNoResults': 'Geen taal gevonden.',

      'hero.eyebrow': 'Mysterieuze roadtripgenerator',
      'hero.title': 'Koers naar het onbekende',
      'hero.subtitle': 'je volgende uitstapje heeft nog geen naam',
      'hero.lede': "Vul je vertrekpunt en je voorwaarden in. De machine loot dag na dag een echte reisroute — tot {maxDays} dagen en {maxStops} steden — tussen de gemeenten van Frankrijk, Andorra, Spanje, Portugal, België en Nederland, plus een paklijst, alles binnen je budget.",
      'hero.disclaimer': 'Gemeenten, afstanden, tol en bezienswaardigheden zijn gebaseerd op officiële gegevens (IGN/GeoNames, tarievengidsen van de snelwegbeheerders, OpenStreetMap). Reistijden en prijzen blijven schattingen — controleer altijd de werkelijke route en de beschikbaarheid van accommodatie voordat je vertrekt.',

      'form.heading': 'Reisblad',
      'form.clockPlaceholder': '— nog in te vullen —',
      'form.city.label': 'Vertrekstad',
      'form.city.loadingPlaceholder': 'Gemeenten worden geladen…',
      'form.city.placeholder': 'Bijv. {name} of {cp}',
      'form.city.error.required': 'Geef een vertrekstad op.',
      'form.city.error.selectFromList': 'Kies een gemeente uit de vervolgkeuzelijst (zoeken op naam of postcode).',
      'form.dates.label': "Data van het verblijf",
      'form.dates.arrivalAria': 'Aankomstdatum',
      'form.dates.returnAria': 'Terugkeerdatum',
      'form.dates.error': 'De terugkeerdatum moet dezelfde dag of later zijn dan de aankomstdatum.',
      'form.dates.oneDay': '1 dag (heen en terug, zonder overnachting)',
      'form.dates.duration1': '{days} dagen (1 nacht)',
      'form.dates.durationN': '{days} dagen ({nights} nachten)',
      'form.dates.maxSuffix': ' — max. {max} dagen',
      'form.dates.placeholder': '—',
      'form.budget.label': 'Totaalbudget',
      'form.budget.economique': 'Budget',
      'form.budget.moyen': 'Gemiddeld',
      'form.budget.confortable': 'Comfort',
      'form.budget.hint': 'Tot {max} € / nacht (indicatief, 2 volwassenen) — gebruikt om Airbnb/Booking-zoekopdrachten vooraf in te vullen.',
      'form.transport.label': 'Vervoermiddel',
      'form.transport.voitureThermique': 'Auto (benzine/diesel)',
      'form.transport.voitureHybride': 'Hybride auto',
      'form.transport.voitureElectrique': 'Elektrische auto',
      'form.transport.van': 'Camperbusje',
      'form.transport.moto': 'Motor',
      'form.transport.velo': 'Fiets / bikepacking',
      'form.toll.label': 'Tolwegen toegestaan',
      'form.ferry.label': 'Veerbootoversteken toegestaan (eilanden)',
      'form.ferry.hint': 'Aangevinkt: de loting kan Corsica, de Balearen, de Canarische Eilanden of de Waddeneilanden bevatten, verbonden via een echte veerbootlijn (nooit per vliegtuig).',
      'form.tent.label': 'Wildkamperen en overnachten in een tent vermijden',
      'form.tent.hint': 'Aangevinkt: overnachtingen onder de blote hemel bij budgetreizen worden vervangen door een hut/yurt/gîte.',
      'form.radius.label': 'Straal-limiet',
      'form.radius.modeKm': 'Max. afstand (km)',
      'form.radius.modeH': 'Max. terugreistijd (u)',
      'form.radius.groupAria': 'Type limiet',
      'form.radius.decAria': 'Verlagen',
      'form.radius.incAria': 'Verhogen',
      'form.radius.unitKm': 'km rond het vertrekpunt',
      'form.radius.unitH': 'terugreistijd',
      'form.radius.hint': 'Geldt alleen voor de {strong} (de terugreis)',
      'form.radius.hintStrong': 'laatste etappe',
      'form.minDistance.label': 'Afstand van huis (optioneel)',
      'form.minDistance.minPlaceholder': 'Geen minimum',
      'form.minDistance.maxPlaceholder': 'Geen maximum',
      'form.minDistance.unitMin': 'km minimaal',
      'form.minDistance.unitMax': 'km maximaal',
      'form.minDistance.hintMin': 'Minimum: de eerste etappe ligt op minstens deze afstand.',
      'form.minDistance.hintMax': 'Maximum: de reis overschrijdt nooit deze afstand tot het vertrekpunt, op geen enkel moment tijdens het verblijf.',
      'form.launch.button': 'Start de willekeurige roadtripgenerator',
      'form.launch.hint': 'Een geheime bestemming wacht op je.',

      'reveal.drawing': 'Loting bezig…',
      'reveal.clueIdle': 'De weg gaat zo spreken.',
      'reveal.clueSpinning': 'Onbekende richting…',
      'reveal.clueFinal': 'Dit is je mysterieuze vertrekpunt.',
      'reveal.clueReduced': 'Een echte plek wacht op je.',
      'reveal.confirmed': 'Bestemming geloot',
      'reveal.stamp': 'Bestemming bevestigd',
      'reveal.inhabitants': '{n} inwoners',
      'reveal.poi1': '1 echte bezienswaardigheid gevonden',
      'reveal.poiN': '{n} echte bezienswaardigheden gevonden',

      'map.title': 'Routekaart',
      'map.note': 'OpenStreetMap-achtergrond. De punten staan op de werkelijke coördinaten van de gemeenten — de lijn verbindt de etappes hemelsbreed, de werkelijke route slingert meer.',
      'map.ariaLabel': 'Routekaart, OpenStreetMap-achtergrond',
      'map.departFallback': 'Vertrek',
      'map.returnLabel': 'terugreis',

      'timeline.title': 'Reislogboek',
      'stats.days': 'dagen',
      'stats.cities': 'steden',
      'stats.nights': 'overnachtingen',
      'stats.totalKm': 'totaal',
      'stats.tollEstimated': 'geschatte tol',
      'stats.tollAvoided': 'vermeden tol',
      'stats.ferryTotal': 'veerboot',

      'day.single': 'Eén dag — mysterieuze dagtrip',
      'day.return': 'Terugreis',
      'day.n': 'Dag {n}',
      'day.nReturn': 'Dag {n} — terugreis',
      'day.rangeAnd': 'Dagen {a} en {b}',
      'day.rangeTo': 'Dagen {a} tot {b}',
      'day.routeTime': '~ {time} onderweg · {km} km',
      'day.crossingTime': '~ {time} overtocht · {km} km',
      'day.stepMystery': 'Mysterieuze etappe: {stop}',
      'day.returnTo': 'Terug naar {stop}',

      'photo.view': "Bekijk een foto van {name}",
      'photo.searching': 'Op zoek naar een echte foto…',
      'photo.real': 'Echte foto · © Wikimedia Commons',
      'photo.none': 'Geen foto gevonden op Wikipedia voor deze plek',
      'photo.unavailable': 'Afbeelding niet beschikbaar — online naar afbeeldingen zoeken',
      'photo.enlargeAria': 'Foto van {name} vergroten',
      'photo.closeAria': 'Foto sluiten',
      'wiki.link': 'Wikipedia ↗',

      'ferry.label': 'Veerbootoversteek',
      'ferry.text': '{route} — ongeveer {amount} € · {duration} overtocht.',
      'ferry.route.corsica': 'Vasteland ↔ Corsica',
      'ferry.route.balearic': 'Vasteland ↔ Balearen',
      'ferry.route.canary': 'Vasteland ↔ Canarische Eilanden',
      'ferry.route.wadden': 'Vasteland ↔ Waddeneilanden',
      'toll.label': 'Tol (ASF-tarief 2026)',
      'toll.barrierFree': 'vrije doorstroming, geen slagboom (automatische facturatie via camera)',
      'toll.barrierClassic': 'klassieke tol met slagboom',
      'toll.enabled': 'Geschatte tol: ~{amount} € ({barrier}) — je bespaart ongeveer {min} min ten opzichte van een tolvrije route.',
      'toll.disabled': 'Zonder tol (optie uitgevinkt): je had ongeveer {min} min kunnen besparen op de snelweg (~{amount} €, {barrier}).',

      'charge.label': 'Elektrisch opladen',
      'charge.text1': '1 geschatte laadstop (~{min} min in totaal) bij een snellader.',
      'charge.textN': '{n} geschatte laadstops (~{min} min in totaal) bij snelladers.',

      'activities.choice': 'Mogelijke activiteiten — naar keuze',
      'activities.day': 'Mogelijke activiteiten — Dag {n}',
      'activities.loadingReal': '— op zoek naar echte lokale activiteiten…',
      'activities.loadingHike': '— op zoek naar een echte wandelroute…',

      'poiType.attraction': 'lokale bezienswaardigheid',
      'poiType.museum': 'museum',
      'poiType.viewpoint': 'uitzichtpunt',
      'poiType.castle': 'kasteel',
      'poiType.gallery': 'galerie',
      'poiType.zoo': 'dierenpark',
      'poiType.theme_park': 'pretpark',
      'poiType.monument': 'monument',
      'poiType.memorial': 'gedenkteken',
      'poiType.archaeological_site': 'archeologische site',
      'poiType.cave_entrance': 'grot',
      'poiType.ruins': 'ruïnes',
      'poiType.fort': 'fort',
      'poiType.citadel': 'citadel',
      'poiType.manor': 'landhuis',
      'poiType.chapel': 'kapel',
      'poiType.place_of_worship': 'religieus gebouw',
      'poiType.nature_reserve': 'natuurreservaat',
      'poiType.peak': 'top',
      'poiType.waterfall': 'waterval',
      'poiType.beach': 'strand',
      'poiType.artwork': 'kunstwerk',
      'poiType.fallback': 'lokale bezienswaardigheid',
      'poiType.walkFallback': 'wandeling',
      'poiType.generic': 'ter plaatse te doen',

      'generic.walk': 'Wandel- of fietstocht in de omgeving',
      'generic.market': 'Lokale markt en streekproducten (dagen ter plaatse controleren)',
      'generic.church': 'Bezoek aan de kerk of het lokale erfgoed',
      'generic.stroll': 'Wandeling door het historische centrum',
      'generic.producer': 'Een lokale producent of ambachtsman ontdekken',

      'hike.sourceLabel': 'Bron: Visorando ↗',
      'hike.defaultType': 'bewegwijzerde wandeling',

      'lodging.find': 'Accommodatie zoeken · {range}',
      'lodging.airbnb': 'Airbnb ↗',
      'lodging.booking': 'Booking.com ↗',
      'lodging.economiqueTent': 'Camping, wildkamperen of natuurterrein (klein budget)',
      'lodging.economiqueNoTent': 'Hostel, eenvoudige kamer of klein hotel (wildkamperen vermeden)',
      'lodging.moyen': 'Gîte, bed & breakfast of 2-3★ hotel',
      'lodging.confortable': 'Sfeervol hotel of luxe verhuur',

      'end.label': 'Missie volbracht',
      'end.text': 'Terug thuis, mysterieuze roadtrip afgerond.',

      'export.hint': 'Zin in deze roadtrip? Download hem, hij wordt waarschijnlijk nooit meer voorgesteld.',
      'export.button': 'Dit reisplan als PDF exporteren',
      'export.generating': 'PDF wordt gegenereerd…',
      'export.error': 'Genereren van de PDF mislukt — probeer het straks opnieuw.',

      'pack.title': 'Te pakken tas',
      'pack.subDefault': 'Het essentiële voor deze mysterieuze missie',
      'pack.sub': 'Voor {transport}, budget {budget}.',

      'again.button': 'Nog een bestemming loten',

      'footer.text': "Koers naar het onbekende — een speelse generator, er wordt nooit gegevens ergens naartoe verstuurd. Gemeenten: IGN / geo.api.gouv.fr (Etalab) voor Frankrijk, GeoNames (CC-BY-licentie) voor Andorra, Spanje, Portugal, België en Nederland. Bezienswaardigheden en kaartachtergrond: © OpenStreetMap-bijdragers (ODbL-licentie). Tol: VINCI Autoroutes (Frankrijk), Autopistas (Spanje), Via Verde/Ascendi (Portugal) — gratis snelwegen in België, Andorra en Nederland.",
      'footer.legalMentions': 'Wettelijke vermeldingen',
      'footer.privacyPolicy': 'Privacybeleid',

      'error.loadData': 'Kan de gegevens niet laden ({msg}). Controleer of de server de map public/data goed aanbiedt.',
      'error.routeImpossible': 'Kan momenteel geen route vanaf deze stad samenstellen — probeer opnieuw, of vergroot de straal.',
      'error.minMaxDistance': 'De minimumafstand ({min} km) mag niet groter zijn dan de maximumafstand ({max} km).',
      'error.minDistanceContextDay': '1 dag en geen overnachting',
      'error.minDistanceContextNight': '1 overnachting',
      'error.minDistanceTooFar': 'Niet mogelijk: met slechts {context} kun je je niet minstens {min} km verwijderen en binnen de gekozen terugkeerstraal/-tijd terugkeren ({radius} km). Verleng het verblijf, verlaag de minimumafstand, of vergroot de maximumstraal.',

      'transport.voitureThermique.label': 'auto',
      'transport.voitureHybride.label': 'hybride auto',
      'transport.voitureElectrique.label': 'elektrische auto',
      'transport.van.label': 'camperbusje',
      'transport.moto.label': 'motor',
      'transport.velo.label': 'fiets'
    },

    de: {
      'lang.buttonLabel': 'Sprache',
      'lang.searchPlaceholder': 'Sprache suchen…',
      'lang.searchNoResults': 'Keine Sprache gefunden.',

      'hero.eyebrow': 'Geheimnisvoller Roadtrip-Generator',
      'hero.title': 'Kurs auf das Unbekannte',
      'hero.subtitle': 'dein nächster Kurztrip hat noch keinen Namen',
      'hero.lede': "Gib deinen Startort und deine Bedingungen an. Die Maschine würfelt Tag für Tag eine echte Route aus — bis zu {maxDays} Tage und {maxStops} Städte — unter den Gemeinden Frankreichs, Andorras, Spaniens, Portugals, Belgiens und der Niederlande, dazu eine Packliste, alles innerhalb deines Budgets.",
      'hero.disclaimer': 'Gemeinden, Entfernungen, Mautgebühren und Sehenswürdigkeiten basieren auf offiziellen Daten (IGN/GeoNames, Tarifübersichten der Autobahnbetreiber, OpenStreetMap). Fahrzeiten und Preise bleiben Schätzungen — prüfe vor der Abfahrt immer die tatsächliche Route und die Verfügbarkeit der Unterkünfte.',

      'form.heading': 'Reiseblatt',
      'form.clockPlaceholder': '— noch auszufüllen —',
      'form.city.label': 'Startort',
      'form.city.loadingPlaceholder': 'Gemeinden werden geladen…',
      'form.city.placeholder': 'Z. B. {name} oder {cp}',
      'form.city.error.required': 'Bitte gib einen Startort an.',
      'form.city.error.selectFromList': 'Wähle eine Gemeinde aus der Dropdown-Liste (Suche nach Name oder Postleitzahl).',
      'form.dates.label': 'Reisedaten',
      'form.dates.arrivalAria': 'Ankunftsdatum',
      'form.dates.returnAria': 'Rückkehrdatum',
      'form.dates.error': 'Das Rückkehrdatum muss am selben Tag wie oder nach dem Ankunftsdatum liegen.',
      'form.dates.oneDay': '1 Tag (Hin- und Rückfahrt, keine Übernachtung)',
      'form.dates.duration1': '{days} Tage (1 Nacht)',
      'form.dates.durationN': '{days} Tage ({nights} Nächte)',
      'form.dates.maxSuffix': ' — max. {max} Tage',
      'form.dates.placeholder': '—',
      'form.budget.label': 'Gesamtbudget',
      'form.budget.economique': 'Günstig',
      'form.budget.moyen': 'Mittel',
      'form.budget.confortable': 'Komfort',
      'form.budget.hint': 'Bis zu {max} € / Nacht (Richtwert, 2 Erwachsene) — dient zum Vorausfüllen der Airbnb-/Booking-Suchen.',
      'form.transport.label': 'Verkehrsmittel',
      'form.transport.voitureThermique': 'Auto (Verbrenner)',
      'form.transport.voitureHybride': 'Hybridauto',
      'form.transport.voitureElectrique': 'Elektroauto',
      'form.transport.van': 'Campingbus',
      'form.transport.moto': 'Motorrad',
      'form.transport.velo': 'Fahrrad / Bikepacking',
      'form.toll.label': 'Mautautobahnen erlaubt',
      'form.ferry.label': 'Fährüberfahrten erlaubt (Inseln)',
      'form.ferry.hint': 'Aktiviert: Die Auslosung kann Korsika, die Balearen, die Kanarischen Inseln oder die Wattenmeerinseln einschließen, verbunden durch eine echte Fährlinie (nie per Flugzeug).',
      'form.tent.label': 'Wildcampen und Zeltnächte vermeiden',
      'form.tent.hint': 'Aktiviert: Nächte unter freiem Himmel im günstigen Budget werden durch Hütte/Jurte/Gîte ersetzt.',
      'form.radius.label': 'Radiusbegrenzung',
      'form.radius.modeKm': 'Max. Entfernung (km)',
      'form.radius.modeH': 'Max. Rückfahrzeit (h)',
      'form.radius.groupAria': 'Art der Begrenzung',
      'form.radius.decAria': 'Verringern',
      'form.radius.incAria': 'Erhöhen',
      'form.radius.unitKm': 'km um den Startort',
      'form.radius.unitH': 'Rückfahrzeit',
      'form.radius.hint': 'Gilt nur für die {strong} (die Rückfahrt)',
      'form.radius.hintStrong': 'letzte Etappe',
      'form.minDistance.label': 'Entfernung von zu Hause (optional)',
      'form.minDistance.minPlaceholder': 'Kein Minimum',
      'form.minDistance.maxPlaceholder': 'Kein Maximum',
      'form.minDistance.unitMin': 'km mindestens',
      'form.minDistance.unitMax': 'km höchstens',
      'form.minDistance.hintMin': 'Minimum: Die erste Etappe liegt mindestens so weit entfernt.',
      'form.minDistance.hintMax': 'Maximum: Die Reise überschreitet diese Entfernung vom Startort zu keinem Zeitpunkt der Reise.',
      'form.launch.button': 'Zufälligen Roadtrip-Generator starten',
      'form.launch.hint': 'Ein geheimes Ziel erwartet dich.',

      'reveal.drawing': 'Auslosung läuft…',
      'reveal.clueIdle': 'Die Straße wird gleich sprechen.',
      'reveal.clueSpinning': 'Unbekannte Richtung…',
      'reveal.clueFinal': 'Hier ist dein geheimnisvoller Startort.',
      'reveal.clueReduced': 'Ein echter Ort erwartet dich.',
      'reveal.confirmed': 'Ziel ausgelost',
      'reveal.stamp': 'Ziel bestätigt',
      'reveal.inhabitants': '{n} Einwohner',
      'reveal.poi1': '1 echte Sehenswürdigkeit gefunden',
      'reveal.poiN': '{n} echte Sehenswürdigkeiten gefunden',

      'map.title': 'Streckenkarte',
      'map.note': 'OpenStreetMap-Hintergrund. Die Punkte sind an den echten Koordinaten der Gemeinden platziert — die Linie verbindet die Etappen Luftlinie, die tatsächliche Route schlängelt sich mehr.',
      'map.ariaLabel': 'Streckenkarte, OpenStreetMap-Hintergrund',
      'map.departFallback': 'Start',
      'map.returnLabel': 'Rückfahrt',

      'timeline.title': 'Reisetagebuch',
      'stats.days': 'Tage',
      'stats.cities': 'Städte',
      'stats.nights': 'Übernachtungen',
      'stats.totalKm': 'insgesamt',
      'stats.tollEstimated': 'geschätzte Maut',
      'stats.tollAvoided': 'vermiedene Maut',
      'stats.ferryTotal': 'Fähre',

      'day.single': 'Eintagesfahrt — geheimnisvolle Hin- und Rückfahrt',
      'day.return': 'Rückfahrt',
      'day.n': 'Tag {n}',
      'day.nReturn': 'Tag {n} — Rückfahrt',
      'day.rangeAnd': 'Tag {a} und {b}',
      'day.rangeTo': 'Tag {a} bis {b}',
      'day.routeTime': '~ {time} Fahrt · {km} km',
      'day.crossingTime': '~ {time} Überfahrt · {km} km',
      'day.stepMystery': 'Geheimnisvolle Etappe: {stop}',
      'day.returnTo': 'Rückfahrt nach {stop}',

      'photo.view': 'Foto von {name} ansehen',
      'photo.searching': 'Suche nach einem echten Foto…',
      'photo.real': 'Echtes Foto · © Wikimedia Commons',
      'photo.none': 'Kein Foto auf Wikipedia für diesen Ort gefunden',
      'photo.unavailable': 'Bild nicht verfügbar — Live-Bildersuche läuft',
      'photo.enlargeAria': 'Foto von {name} vergrößern',
      'photo.closeAria': 'Foto schließen',
      'wiki.link': 'Wikipedia ↗',

      'ferry.label': 'Fährüberfahrt',
      'ferry.text': '{route} — etwa {amount} € · {duration} Überfahrt.',
      'ferry.route.corsica': 'Festland ↔ Korsika',
      'ferry.route.balearic': 'Festland ↔ Balearen',
      'ferry.route.canary': 'Festland ↔ Kanarische Inseln',
      'ferry.route.wadden': 'Festland ↔ Wattenmeerinseln',
      'toll.label': 'Maut (ASF-Tarif 2026)',
      'toll.barrierFree': 'freie Durchfahrt ohne Schranke (automatische Erfassung per Kamera)',
      'toll.barrierClassic': 'klassische Mautstelle mit Schranke',
      'toll.enabled': 'Geschätzte Maut: ~{amount} € ({barrier}) — du sparst etwa {min} Min. gegenüber einer mautfreien Strecke.',
      'toll.disabled': 'Ohne Maut (Option deaktiviert): du hättest auf der Autobahn etwa {min} Min. sparen können (~{amount} €, {barrier}).',

      'charge.label': 'Elektrisches Laden',
      'charge.text1': '1 geschätzter Ladestopp (~{min} Min. insgesamt) an einer Schnellladestation.',
      'charge.textN': '{n} geschätzte Ladestopps (~{min} Min. insgesamt) an Schnellladestationen.',

      'activities.choice': 'Mögliche Aktivitäten — zur Auswahl',
      'activities.day': 'Mögliche Aktivitäten — Tag {n}',
      'activities.loadingReal': '— Suche nach echten lokalen Aktivitäten…',
      'activities.loadingHike': '— Suche nach einer echten Wanderroute…',

      'poiType.attraction': 'lokale Sehenswürdigkeit',
      'poiType.museum': 'Museum',
      'poiType.viewpoint': 'Aussichtspunkt',
      'poiType.castle': 'Schloss',
      'poiType.gallery': 'Galerie',
      'poiType.zoo': 'Tierpark',
      'poiType.theme_park': 'Freizeitpark',
      'poiType.monument': 'Denkmal',
      'poiType.memorial': 'Gedenkstätte',
      'poiType.archaeological_site': 'archäologische Stätte',
      'poiType.cave_entrance': 'Höhle',
      'poiType.ruins': 'Ruinen',
      'poiType.fort': 'Festung',
      'poiType.citadel': 'Zitadelle',
      'poiType.manor': 'Herrenhaus',
      'poiType.chapel': 'Kapelle',
      'poiType.place_of_worship': 'Sakralbau',
      'poiType.nature_reserve': 'Naturschutzgebiet',
      'poiType.peak': 'Gipfel',
      'poiType.waterfall': 'Wasserfall',
      'poiType.beach': 'Strand',
      'poiType.artwork': 'Kunstwerk',
      'poiType.fallback': 'lokale Sehenswürdigkeit',
      'poiType.walkFallback': 'Spaziergang',
      'poiType.generic': 'vor Ort zu erleben',

      'generic.walk': 'Wanderung oder Spaziergang in der Umgebung',
      'generic.market': 'Lokaler Markt und regionale Produkte (Tage vor Ort prüfen)',
      'generic.church': 'Besuch der Kirche oder des lokalen Baudenkmals',
      'generic.stroll': 'Bummel durch die historische Altstadt',
      'generic.producer': 'Einen lokalen Erzeuger oder Handwerker entdecken',

      'hike.sourceLabel': 'Quelle: Visorando ↗',
      'hike.defaultType': 'markierte Wanderung',

      'lodging.find': 'Unterkunft finden · {range}',
      'lodging.airbnb': 'Airbnb ↗',
      'lodging.booking': 'Booking.com ↗',
      'lodging.economiqueTent': 'Campingplatz, Wildcamping oder Naturfläche (kleines Budget)',
      'lodging.economiqueNoTent': 'Hostel, einfaches Zimmer oder kleines Hotel (Wildcamping vermieden)',
      'lodging.moyen': 'Gîte, Gästezimmer oder 2-3★-Hotel',
      'lodging.confortable': 'Charmantes Hotel oder hochwertige Ferienunterkunft',

      'end.label': 'Mission abgeschlossen',
      'end.text': 'Zurück zu Hause, geheimnisvoller Roadtrip beendet.',

      'export.hint': 'Reizt dich dieser Roadtrip? Denk daran, ihn herunterzuladen — er wird wahrscheinlich nie wieder vorgeschlagen.',
      'export.button': 'Diese Reiseroute als PDF exportieren',
      'export.generating': 'PDF wird erstellt…',
      'export.error': 'PDF-Erstellung fehlgeschlagen — versuche es gleich noch einmal.',

      'pack.title': 'Packliste',
      'pack.subDefault': 'Das Nötigste für diese geheimnisvolle Mission',
      'pack.sub': 'Für {transport}, Budget {budget}.',

      'again.button': 'Neues Ziel auslosen',

      'footer.text': "Kurs auf das Unbekannte — ein spielerischer Generator, es werden nie Daten irgendwohin gesendet. Gemeinden: IGN / geo.api.gouv.fr (Etalab) für Frankreich, GeoNames (CC-BY-Lizenz) für Andorra, Spanien, Portugal, Belgien und die Niederlande. Sehenswürdigkeiten und Kartenhintergrund: © OpenStreetMap-Mitwirkende (ODbL-Lizenz). Maut: VINCI Autoroutes (Frankreich), Autopistas (Spanien), Via Verde/Ascendi (Portugal) — mautfreie Autobahnen in Belgien, Andorra und den Niederlanden.",
      'footer.legalMentions': 'Impressum',
      'footer.privacyPolicy': 'Datenschutzerklärung',

      'error.loadData': 'Die Daten konnten nicht geladen werden ({msg}). Prüfe, ob der Server den Ordner public/data korrekt bereitstellt.',
      'error.routeImpossible': 'Von dieser Stadt aus lässt sich momentan keine Route erstellen — versuche es erneut oder vergrößere den Radius.',
      'error.minMaxDistance': 'Die Mindestentfernung ({min} km) darf die Höchstentfernung ({max} km) nicht überschreiten.',
      'error.minDistanceContextDay': '1 Tag und keine Übernachtung',
      'error.minDistanceContextNight': '1 Übernachtung',
      'error.minDistanceTooFar': 'Nicht möglich: Mit nur {context} kann man sich nicht mindestens {min} km entfernen und innerhalb des gewählten Rückfahrradius/-zeit ({radius} km) zurückkehren. Verlängere die Reisedauer, verringere die Mindestentfernung oder vergrößere den Maximalradius.',

      'transport.voitureThermique.label': 'Auto',
      'transport.voitureHybride.label': 'Hybridauto',
      'transport.voitureElectrique.label': 'Elektroauto',
      'transport.van.label': 'Campingbus',
      'transport.moto.label': 'Motorrad',
      'transport.velo.label': 'Fahrrad'
    }
  };

  // Valeurs-listes (items du sac à préparer, activités génériques...) : séparées de STRINGS
  // (valeurs scalaires) pour ne pas mélanger deux formes différentes derrière la même fonction de
  // lookup — voir tl() plus bas.
  var LISTS = {
    fr: {
      'pack.base': ['Trousse à pharmacie', 'Gourde réutilisable', 'Chargeur & batterie externe', "Espèces d'appoint", 'Playlist de route'],
      'pack.economique': ['Duvet 3 saisons', 'Popote / réchaud de camping', 'Tente ultralégère (en secours du bivouac)'],
      'pack.moyen': ['Nécessaire de toilette compact', 'Petit coussin de voyage'],
      'pack.confortable': ['Une tenue correcte pour le restaurant du soir', 'Trousse de toilette complète'],
      'pack.voitureThermique': ['Carte grise et permis à jour', 'Trousse de secours'],
      'pack.voitureHybride': ['Carte grise et permis à jour', 'Trousse de secours'],
      'pack.voitureElectrique': ['Câble de recharge Type 2', 'Appli multi-réseaux de bornes de recharge (ex. Chargemap)', "Marge de 20% sur l'autonomie annoncée"],
      'pack.van': ["Jerrican d'eau potable", 'Cartouche de gaz de camping', 'Cales de mise à niveau'],
      'pack.moto': ['Casque et gants', 'Combinaison ou surpantalon pluie', 'Sangles élastiques pour bagages'],
      'pack.velo': ['Kit anti-crevaison complet', 'Sacoches étanches', 'Batterie externe pour le GPS']
    },
    en: {
      'pack.base': ['First-aid kit', 'Reusable water bottle', 'Charger & power bank', 'Spare cash', 'Road trip playlist'],
      'pack.economique': ['3-season sleeping bag', 'Camping stove / cookware', 'Ultralight tent (backup for wild camping)'],
      'pack.moyen': ['Compact toiletry bag', 'Small travel pillow'],
      'pack.confortable': ['A decent outfit for dinner out', 'Full toiletry kit'],
      'pack.voitureThermique': ['Vehicle registration & valid licence', 'First-aid kit'],
      'pack.voitureHybride': ['Vehicle registration & valid licence', 'First-aid kit'],
      'pack.voitureElectrique': ['Type 2 charging cable', 'Multi-network charging app (e.g. Chargemap)', '20% margin on the stated range'],
      'pack.van': ['Drinking water jerrycan', 'Camping gas canister', 'Levelling blocks'],
      'pack.moto': ['Helmet and gloves', 'Rain suit or overtrousers', 'Elastic luggage straps'],
      'pack.velo': ['Full puncture repair kit', 'Waterproof panniers', 'External battery for the GPS']
    },
    es: {
      'pack.base': ['Botiquín de primeros auxilios', 'Cantimplora reutilizable', 'Cargador y batería externa', 'Dinero en efectivo de reserva', 'Lista de reproducción de viaje'],
      'pack.economique': ['Saco de dormir 3 estaciones', 'Hornillo / menaje de camping', 'Tienda ultraligera (por si falla la acampada libre)'],
      'pack.moyen': ['Neceser compacto', 'Cojín de viaje pequeño'],
      'pack.confortable': ['Un conjunto decente para cenar fuera', 'Neceser completo'],
      'pack.voitureThermique': ['Permiso de circulación y carnet en vigor', 'Botiquín de urgencia'],
      'pack.voitureHybride': ['Permiso de circulación y carnet en vigor', 'Botiquín de urgencia'],
      'pack.voitureElectrique': ['Cable de carga Tipo 2', 'App multirred de puntos de carga (ej. Chargemap)', '20% de margen sobre la autonomía anunciada'],
      'pack.van': ['Garrafa de agua potable', 'Cartucho de gas de camping', 'Calzos de nivelación'],
      'pack.moto': ['Casco y guantes', 'Traje o pantalón de lluvia', 'Correas elásticas para el equipaje'],
      'pack.velo': ['Kit completo antipinchazos', 'Alforjas impermeables', 'Batería externa para el GPS']
    },
    pt: {
      'pack.base': ['Kit de primeiros socorros', 'Garrafa de água reutilizável', 'Carregador e bateria externa', 'Dinheiro extra', 'Lista de reprodução de viagem'],
      'pack.economique': ['Saco-cama 3 estações', 'Fogareiro / utensílios de campismo', 'Tenda ultraleve (reserva para o bivaque)'],
      'pack.moyen': ['Nécessaire compacto', 'Almofada de viagem pequena'],
      'pack.confortable': ['Um conjunto decente para jantar fora', 'Nécessaire completo'],
      'pack.voitureThermique': ['Documento único e carta de condução válidos', 'Kit de primeiros socorros'],
      'pack.voitureHybride': ['Documento único e carta de condução válidos', 'Kit de primeiros socorros'],
      'pack.voitureElectrique': ['Cabo de carregamento Tipo 2', 'Aplicação multirrede de postos de carregamento (ex. Chargemap)', '20% de margem sobre a autonomia anunciada'],
      'pack.van': ['Bidão de água potável', 'Cartucho de gás de campismo', 'Calços de nivelamento'],
      'pack.moto': ['Capacete e luvas', 'Fato ou sobrecalças de chuva', 'Cintas elásticas para a bagagem'],
      'pack.velo': ['Kit completo antifuros', 'Alforges impermeáveis', 'Bateria externa para o GPS']
    },
    nl: {
      'pack.base': ['EHBO-kit', 'Herbruikbare drinkfles', 'Oplader & powerbank', 'Extra contant geld', 'Reismuziek-afspeellijst'],
      'pack.economique': ['Slaapzak 3 seizoenen', 'Kampeerkooktoestel', 'Ultralichte tent (reserve voor wildkamperen)'],
      'pack.moyen': ['Compact toilettasje', 'Klein reiskussen'],
      'pack.confortable': ['Een net setje voor het avondeten uit', 'Volledig toilettasje'],
      'pack.voitureThermique': ['Geldig kentekenbewijs en rijbewijs', 'EHBO-kit'],
      'pack.voitureHybride': ['Geldig kentekenbewijs en rijbewijs', 'EHBO-kit'],
      'pack.voitureElectrique': ['Type 2-laadkabel', 'Multi-netwerk laadpas-app (bijv. Chargemap)', '20% marge op de opgegeven actieradius'],
      'pack.van': ['Jerrycan drinkwater', 'Campinggascartouche', 'Nivelleerblokken'],
      'pack.moto': ['Helm en handschoenen', 'Regenpak of overbroek', 'Elastische bagagespanbanden'],
      'pack.velo': ['Volledige lekreparatieset', 'Waterdichte fietstassen', 'Externe batterij voor de gps']
    },
    de: {
      'pack.base': ['Reiseapotheke', 'Wiederverwendbare Trinkflasche', 'Ladegerät & Powerbank', 'Bargeldreserve', 'Roadtrip-Playlist'],
      'pack.economique': ['3-Jahreszeiten-Schlafsack', 'Campingkocher / -geschirr', 'Ultraleichtzelt (Ersatz für Wildcamping)'],
      'pack.moyen': ['Kompakte Kulturtasche', 'Kleines Reisekissen'],
      'pack.confortable': ['Ein passendes Outfit fürs Abendessen', 'Vollständige Kulturtasche'],
      'pack.voitureThermique': ['Gültiger Fahrzeugschein und Führerschein', 'Erste-Hilfe-Set'],
      'pack.voitureHybride': ['Gültiger Fahrzeugschein und Führerschein', 'Erste-Hilfe-Set'],
      'pack.voitureElectrique': ['Typ-2-Ladekabel', 'Multi-Netzwerk-Lade-App (z. B. Chargemap)', '20% Reserve auf die angegebene Reichweite'],
      'pack.van': ['Trinkwasserkanister', 'Camping-Gaskartusche', 'Unterlegkeile'],
      'pack.moto': ['Helm und Handschuhe', 'Regenkombi oder Überhose', 'Elastische Gepäckspanngurte'],
      'pack.velo': ['Komplettes Pannenset', 'Wasserdichte Packtaschen', 'Externer Akku fürs GPS']
    }
  };

  function currentLang(){
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if(stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch(e){ /* stockage indisponible : on retombe sur la détection navigateur */ }
    var navLangs = navigator.languages || [navigator.language || 'fr'];
    for(var i=0;i<navLangs.length;i++){
      var code = String(navLangs[i]).split('-')[0].toLowerCase();
      if(SUPPORTED.indexOf(code) !== -1) return code;
    }
    return 'fr';
  }

  var lang = currentLang();

  function interpolate(str, vars){
    if(!vars) return str;
    return str.replace(/\{(\w+)\}/g, function(m, key){
      return (vars[key] !== undefined && vars[key] !== null) ? String(vars[key]) : m;
    });
  }
  function t(key, vars){
    var dict = STRINGS[lang] || STRINGS.fr;
    var val = dict[key];
    if(val === undefined) val = STRINGS.fr[key]; // repli sur le français si la clé manque encore ailleurs
    if(val === undefined) return key; // filet de sécurité visible plutôt qu'un "undefined" silencieux
    return interpolate(val, vars);
  }
  function tl(key){
    var dict = LISTS[lang] || LISTS.fr;
    return dict[key] || LISTS.fr[key] || [];
  }

  function applyStaticTranslations(){
    document.documentElement.setAttribute('lang', lang);
    var nodes = document.querySelectorAll('[data-i18n]');
    for(var i=0;i<nodes.length;i++){
      var key = nodes[i].getAttribute('data-i18n');
      nodes[i].textContent = t(key);
    }
    ['placeholder','aria-label','title'].forEach(function(attr){
      var sel = '[data-i18n-' + attr + ']';
      var els = document.querySelectorAll(sel);
      for(var j=0;j<els.length;j++){
        var k = els[j].getAttribute('data-i18n-' + attr);
        els[j].setAttribute(attr, t(k));
      }
    });
    // Seul texte de l'interface statique avec une mise en emphase au milieu (<strong>) — un seul
    // cas, pas besoin d'un mécanisme générique pour ça : la clé garde un "{strong}" littéral (t()
    // sans vars ne le remplace pas, voir interpolate()) qu'on substitue ici par le fragment HTML.
    var radiusHintEl = document.getElementById('radius-hint-line');
    if(radiusHintEl){
      radiusHintEl.innerHTML = t('form.radius.hint').replace('{strong}', '<strong>' + t('form.radius.hintStrong') + '</strong>');
    }
  }

  function setLang(code){
    if(SUPPORTED.indexOf(code) === -1 || code === lang) return;
    lang = code;
    try { localStorage.setItem(STORAGE_KEY, code); } catch(e){ /* pas grave, juste pas mémorisé */ }
    applyStaticTranslations();
    renderSwitcherButton();
    window.dispatchEvent(new CustomEvent('i18n:langchange', { detail: { lang: code } }));
  }

  /* ---------- SÉLECTEUR DE LANGUE (bouton + liste cherchable) ---------- */
  // Même emplacement/esprit que le bouton de thème (voir theme.js), mais un simple cycle à 3 états
  // ne tient pas la route dès 6 langues (et encore moins au-delà, voir la recherche prévue pour
  // ça) : un bouton ouvre un petit panneau avec un champ de recherche + la liste filtrée, comme un
  // sélecteur classique. Construit entièrement en JS (pas de markup figé dans index.html, à part le
  // conteneur `#lang-switcher`) pour rester facile à faire grandir (ajouter une langue = une seule
  // entrée dans SUPPORTED/LANG_NAMES/STRINGS, rien à toucher ici).
  var switcherRoot = null, panelEl = null, searchInput = null, listEl = null, buttonEl = null;

  function renderSwitcherButton(){
    if(!buttonEl) return;
    buttonEl.querySelector('.lang-toggle-code').textContent = lang.toUpperCase();
  }

  function closePanel(){
    if(panelEl) panelEl.classList.remove('show');
    if(buttonEl) buttonEl.setAttribute('aria-expanded', 'false');
  }
  function openPanel(){
    if(!panelEl) return;
    panelEl.classList.add('show');
    buttonEl.setAttribute('aria-expanded', 'true');
    searchInput.value = '';
    renderLangList('');
    setTimeout(function(){ searchInput.focus(); }, 0);
  }
  function renderLangList(query){
    var q = query.trim().toLowerCase();
    listEl.innerHTML = '';
    var matches = SUPPORTED.filter(function(code){
      return !q || code.indexOf(q) === 0 || LANG_NAMES[code].toLowerCase().indexOf(q) !== -1;
    });
    if(matches.length === 0){
      var empty = document.createElement('li');
      empty.className = 'lang-option-empty';
      empty.textContent = t('lang.searchNoResults');
      listEl.appendChild(empty);
      return;
    }
    matches.forEach(function(code){
      var li = document.createElement('li');
      li.className = 'lang-option' + (code === lang ? ' active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', code === lang ? 'true' : 'false');
      var codeSpan = document.createElement('span');
      codeSpan.className = 'lang-option-code';
      codeSpan.textContent = code.toUpperCase();
      var nameSpan = document.createElement('span');
      nameSpan.className = 'lang-option-name';
      nameSpan.textContent = LANG_NAMES[code];
      li.appendChild(codeSpan);
      li.appendChild(nameSpan);
      li.addEventListener('mousedown', function(e){ e.preventDefault(); setLang(code); closePanel(); });
      listEl.appendChild(li);
    });
  }

  function buildSwitcher(){
    switcherRoot = document.getElementById('lang-switcher');
    if(!switcherRoot) return; // page sans sélecteur (aucune pour l'instant, mais reste défensif)

    buttonEl = document.createElement('button');
    buttonEl.type = 'button';
    buttonEl.className = 'lang-toggle-btn';
    buttonEl.setAttribute('aria-haspopup', 'listbox');
    buttonEl.setAttribute('aria-expanded', 'false');
    buttonEl.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.8 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.8-3.8-9S9.5 5.5 12 3Z"/>' +
      '</svg>' +
      '<span class="lang-toggle-code"></span>';

    panelEl = document.createElement('div');
    panelEl.className = 'lang-panel';
    panelEl.setAttribute('role', 'dialog');

    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'lang-search';
    searchInput.setAttribute('role', 'combobox');
    searchInput.setAttribute('aria-expanded', 'true');
    searchInput.autocomplete = 'off';

    listEl = document.createElement('ul');
    listEl.className = 'lang-option-list';
    listEl.setAttribute('role', 'listbox');

    panelEl.appendChild(searchInput);
    panelEl.appendChild(listEl);

    switcherRoot.appendChild(buttonEl);
    switcherRoot.appendChild(panelEl);

    buttonEl.addEventListener('click', function(){
      if(panelEl.classList.contains('show')) closePanel(); else openPanel();
    });
    searchInput.addEventListener('input', function(){ renderLangList(searchInput.value); });
    searchInput.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ closePanel(); buttonEl.focus(); } });
    document.addEventListener('click', function(e){
      if(!switcherRoot.contains(e.target)) closePanel();
    });

    renderSwitcherButton();
  }

  function applyPanelTexts(){
    if(!searchInput) return;
    searchInput.placeholder = t('lang.searchPlaceholder');
    buttonEl.setAttribute('aria-label', t('lang.buttonLabel'));
    buttonEl.title = t('lang.buttonLabel');
  }

  function init(){
    buildSwitcher();
    applyPanelTexts();
    applyStaticTranslations();
    window.addEventListener('i18n:langchange', applyPanelTexts);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.I18N = {
    SUPPORTED: SUPPORTED,
    LANG_NAMES: LANG_NAMES,
    current: function(){ return lang; },
    set: setLang,
    t: t,
    tl: tl,
    applyStaticTranslations: applyStaticTranslations
  };
})();
