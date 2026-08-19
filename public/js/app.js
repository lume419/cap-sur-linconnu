
(async function(){
  "use strict";

  // Les données (communes, points d'intérêt réels, contour de la France) ne sont plus embarquées
  // dans le script : elles sont chargées depuis /data au démarrage. Le formulaire reste désactivé
  // (voir index.html) tant que ce chargement n'est pas terminé.
  var COMMUNES_RAW, FEATURED_RAW, FRANCE_MAP;
  try {
    var results = await Promise.all([
      fetch('data/communes.txt').then(function(r){ if(!r.ok) throw new Error('communes.txt : HTTP '+r.status); return r.text(); }),
      fetch('data/featured.txt').then(function(r){ if(!r.ok) throw new Error('featured.txt : HTTP '+r.status); return r.text(); }),
      fetch('data/france-map.json').then(function(r){ if(!r.ok) throw new Error('france-map.json : HTTP '+r.status); return r.json(); })
    ]);
    COMMUNES_RAW = results[0];
    FEATURED_RAW = results[1];
    FRANCE_MAP = results[2];
  } catch(err){
    var loadErr = document.getElementById('load-error');
    if(loadErr){
      loadErr.textContent = "Impossible de charger les données (" + err.message + "). Vérifiez que le serveur sert bien le dossier public/data.";
      loadErr.classList.add('show');
    }
    return;
  }

  /* ---------- ICONS ---------- */
  var ICONS = {
    bed:'<path d="M3 18v-7a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2M3 18v2M3 18h18M13 13h6a2 2 0 0 1 2 2v3M21 18v2M7 11a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"/>',
    spark:'<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    plug:'<path d="M9 7V3M15 7V3M7 7h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7Z"/><path d="M12 15v3M9 21h6"/>',
    toll:'<path d="M4 21V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v15M20 21V6a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v15"/><path d="M7 12l10-5M4 21h16"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    camera:'<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.3"/>',
    walk:'<path d="M3 19l6-11 4 6 2-3 6 8H3Z"/><circle cx="8" cy="6" r="1.6"/>',
    zoom:'<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6"/><path d="M21 21l-4.3-4.3"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>'
  };
  function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ICONS[name]+'</svg>';}

  /* ---------- POP-UP PHOTO (agrandissement en qualité maximale) ---------- */
  // Une seule popup réutilisée pour toutes les images cliquables (tuile principale + activités) :
  // on y affiche l'image en résolution d'origine renvoyée par Wikipédia (imageFull), pas la
  // vignette utilisée dans les tuiles.
  var lightboxEl = null;
  function ensureLightbox(){
    if(lightboxEl) return lightboxEl;
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';
    lightboxEl.setAttribute('role', 'dialog');
    lightboxEl.setAttribute('aria-modal', 'true');
    lightboxEl.innerHTML =
      '<button type="button" class="lightbox-close" aria-label="Fermer la photo">'+icon('close')+'</button>'+
      '<img class="lightbox-img" alt="">'+
      '<div class="lightbox-caption"></div>';
    document.body.appendChild(lightboxEl);
    lightboxEl.addEventListener('click', function(e){ if(e.target === lightboxEl) closeLightbox(); });
    lightboxEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && lightboxEl.classList.contains('show')) closeLightbox();
    });
    return lightboxEl;
  }
  function openLightbox(imgUrl, caption, wikiUrl){
    if(!imgUrl) return;
    var el = ensureLightbox();
    var img = el.querySelector('.lightbox-img');
    img.src = imgUrl;
    img.alt = caption || '';
    var capEl = el.querySelector('.lightbox-caption');
    capEl.innerHTML = (caption ? '<span>'+caption+'</span>' : '') +
      (wikiUrl ? '<a href="'+wikiUrl+'" target="_blank" rel="noopener">Wikipédia ↗</a>' : '');
    el.classList.add('show');
    document.body.classList.add('lightbox-open');
  }
  function closeLightbox(){
    if(!lightboxEl) return;
    lightboxEl.classList.remove('show');
    document.body.classList.remove('lightbox-open');
    lightboxEl.querySelector('.lightbox-img').src = '';
  }

  /* ---------- REFERENCE DATA ---------- */
  var TRANSPORT = {
    'voiture-thermique': {label:'voiture', speed:82, tollClass:1, extra:["Carte grise et permis à jour","Trousse de secours"]},
    'voiture-hybride': {label:'voiture hybride', speed:81, tollClass:1, extra:["Carte grise et permis à jour","Trousse de secours"]},
    'voiture-electrique': {label:'voiture électrique', speed:78, electric:true, tollClass:1, extra:["Câble de recharge Type 2","Appli multi-réseaux de bornes de recharge (ex. Chargemap)","Marge de 20% sur l'autonomie annoncée"]},
    'van': {label:'van', speed:70, tollClass:2, extra:["Jerrican d'eau potable","Cartouche de gaz de camping","Cales de mise à niveau"]},
    'moto': {label:'moto', speed:85, tollClass:5, extra:["Casque et gants","Combinaison ou surpantalon pluie","Sangles élastiques pour bagages"]},
    'velo': {label:'vélo', speed:17, tollClass:null, extra:["Kit anti-crevaison complet","Sacoches étanches","Batterie externe pour le GPS"]}
  };
  // Recharge électrique : autonomie route réaliste retenue avant de viser une pause.
  var EV_RANGE_KM = 320;
  var EV_CHARGE_MARGIN = 0.75; // on recharge avant d'atteindre 75% de l'autonomie annoncée

  // ---- Péage : barème dérivé des guides tarifaires officiels VINCI Autoroutes 2026 ----
  // Sources : ASF (public-content.vinci-autoroutes.com/PDF/Tarifs-peage-asf/ASF-Guide-tarifaire-2026-maj062026.pdf)
  // et Cofiroute (.../PDF/Tarifs-peage-Cofiroute/Cofiroute-Guide-tarifaire-2026.pdf) : 54 liaisons réelles au
  // total, avec leur tarif TTC par classe de véhicule (30 depuis la page "Tarifs des principales liaisons" ASF,
  // 24 extraites de la grille gare-à-gare Cofiroute, sélectionnées pour leur lisibilité géographique).
  // Escota (Côte d'Azur) a aussi été consultée : son guide reproduit la même table nationale que celle d'ASF,
  // sans données additionnelles distinctes. Arcos (A355, contournement de Strasbourg) et Duplex A86 (tunnel
  // Rueil-Vaucresson-Vélizy) publient des tarifs forfaitaires modulés par heure de la journée plutôt qu'un
  // barème kilométrique — non comparables à ce modèle, ils ne sont donc pas intégrés au calcul.
  // Aucun de ces guides ne publie la distance des liaisons : elle est reconstituée ici à partir des coordonnées
  // officielles des communes (geo.api.gouv.fr) avec un facteur correcteur "vol d'oiseau -> route" de 1,17
  // (ratio usuellement admis pour les grands axes autoroutiers français, peu sinueux). Le tarif €/km retenu
  // par classe est la médiane observée sur l'ensemble des 54 liaisons listées ci-dessous (TOLL_REFERENCE).
  
  // Médiane €/km observée sur les 30 liaisons ci-dessus (classe 1 / 2 / 5). La classe 2 s'applique
  // au van aménagé (hauteur/PTAC), la classe 5 aux motos ; le vélo est exclu (interdit sur autoroute).
  var TOLL_RATE_BY_CLASS = { 1: 0.148, 2: 0.230, 5: 0.086 };
  var TOLL_MIN_DISTANCE_KM = 60; // en-deçà, le péage n'entre pas en ligne de compte
  var BUDGET = {
    economique:{label:'économique', order:0},
    moyen:{label:'moyen', order:1},
    confortable:{label:'confortable', order:2}
  };
  // Plafond de prix / nuit (2 adultes) utilisé uniquement pour préremplir les liens de recherche
  // Airbnb / Booking — un repère indicatif choisi pour ce générateur, pas une donnée tarifaire réelle.
  var BUDGET_PRICE_MAX = { economique: 70, moyen: 130, confortable: 260 };
  var PACK_BASE = ["Trousse à pharmacie","Gourde réutilisable","Chargeur & batterie externe","Espèces d'appoint","Playlist de route"];
  var PACK_BUDGET = {
    economique:["Duvet 3 saisons","Popote / réchaud de camping","Tente ultralégère (en secours du bivouac)"],
    moyen:["Nécessaire de toilette compact","Petit coussin de voyage"],
    confortable:["Une tenue correcte pour le restaurant du soir","Trousse de toilette complète"]
  };

  /* ---------- POINTS D'INTÉRÊT RÉELS (OpenStreetMap) ---------- */
  // ~300 communes disposant d'au moins un point d'intérêt touristique ou patrimonial nommé,
  // extraites d'OpenStreetMap (données © contributeurs OpenStreetMap, licence ODbL) via l'API
  // Overpass, filtrées par appartenance réelle au territoire français (test géométrique contre
  // le contour IGN) puis rattachées à leur commune la plus proche. Couverture honnête : ces
  // ~300 communes ont une activité précise et réellement nommée ; les ~35 000 autres communes
  // du pays restent des étapes possibles, avec une activité générique (marché, patrimoine
  // local, balade) plutôt qu'un point d'intérêt inventé.
  
  var POI_TYPE_LABEL = {
    attraction:'curiosité locale', museum:'musée', viewpoint:'point de vue', castle:'château',
    gallery:'galerie', zoo:'parc animalier', theme_park:"parc d'attractions",
    monument:'monument', memorial:'mémorial', archaeological_site:'site archéologique',
    cave_entrance:'grotte', ruins:'ruines', fort:'fort', citadel:'citadelle', manor:'manoir',
    chapel:'chapelle', place_of_worship:'édifice religieux', nature_reserve:'réserve naturelle',
    peak:'sommet', waterfall:'cascade', beach:'plage', artwork:"œuvre d'art"
  };
  var GENERIC_ACTIVITIES = [
    "Flânerie dans le centre historique",
    "Marché local et produits du terroir (jours à vérifier sur place)",
    "Visite de l'église ou du patrimoine bâti local",
    "Randonnée ou balade dans les environs",
    "Découverte d'un producteur ou artisan local"
  ];
  // Suggestions génériques hors "balade" : la balade a sa propre logique de sélection
  // (voir buildActivityOptions) pour éviter le doublon avec GENERIC_ACTIVITIES ci-dessus.
  var GENERIC_ACTIVITIES_NO_WALK = GENERIC_ACTIVITIES.filter(function(a){ return a.indexOf('Randonnée') !== 0; });
  // Types de POI OSM qui se prêtent à une vraie suggestion de balade/randonnée (plutôt qu'une
  // visite en intérieur) : on les préfère comme suggestion "balade" quand ils sont disponibles.
  var WALK_POI_TYPES = { viewpoint:1, nature_reserve:1, peak:1, waterfall:1, cave_entrance:1, beach:1 };
  var FEATURED = {};
  FEATURED_RAW.split('\n').forEach(function(line){
    var parts = line.split(';');
    var nom = parts[0], lat = parseFloat(parts[1]), lon = parseFloat(parts[2]);
    var poisStr = parts[3] || '';
    var pois = poisStr ? poisStr.split('|').map(function(s){
      var m = s.match(/^(.*)\(([a-z_]+)\)$/);
      return m ? {name:m[1], type:m[2]} : {name:s, type:''};
    }) : [];
    FEATURED[normalizeCityName(nom)] = {name:nom, lat:lat, lon:lon, pois:pois};
  });
  /* ---------- BASE DES COMMUNES FRANÇAISES ---------- */
  // Couverture complète : ~35 000 communes (nom officiel + population + coordonnées + code(s) postal/postaux),
  // dérivées du Découpage administratif officiel (IGN / geo.api.gouv.fr, licence ouverte Etalab).
  // Format compact d'une ligne par commune : "population;lon,lat;cp1,cp2,...;Nom officiel"
  
  var DIACRITICS_RE = new RegExp("[̀-ͯ]", "g");
  var SEP_RE = /[-'’]/g;
  function normalizeCityName(s){
    return String(s||'').trim().toLowerCase()
      .normalize('NFD').replace(DIACRITICS_RE,'')
      .replace(SEP_RE,' ').replace(/\s+/g,' ').trim();
  }
  var COMMUNES = COMMUNES_RAW.split('\n').map(function(line){
    var parts = line.split(';');
    var pop = parseInt(parts[0], 10) || 0;
    var latlon = parts[1].split(',');
    var lon = parseFloat(latlon[0]);
    var lat = parseFloat(latlon[1]);
    var cps = parts[2].split(',');
    var dept = parts[3];
    var name = parts[4];
    return { name:name, norm:normalizeCityName(name), cps:cps, pop:pop, lat:lat, lon:lon, dept:dept };
  });

  // Recherche à partir de 3 caractères : chiffres -> préfixe de code postal, lettres -> préfixe du nom.
  // Résultats triés par population décroissante pour faire remonter les villes connues.
  function searchCommunes(query, limit){
    var q = normalizeCityName(query);
    if(q.length < 3) return [];
    var isPostal = /^[0-9]/.test(q);
    var matches = [];
    for(var i=0; i<COMMUNES.length; i++){
      var c = COMMUNES[i];
      if(isPostal){
        var matchCp = null;
        for(var j=0;j<c.cps.length;j++){ if(c.cps[j].indexOf(q)===0){ matchCp = c.cps[j]; break; } }
        if(matchCp) matches.push({name:c.name, cp:matchCp, allCps:c.cps, pop:c.pop, lat:c.lat, lon:c.lon, dept:c.dept});
      } else if(c.norm.indexOf(q)===0){
        matches.push({name:c.name, cp:c.cps[0], allCps:c.cps, pop:c.pop, lat:c.lat, lon:c.lon, dept:c.dept});
      }
    }
    matches.sort(function(a,b){ return b.pop - a.pop; });
    return matches.slice(0, limit);
  }


  /* ---------- FOND DE CARTE : CONTOUR DE LA FRANCE ---------- */
  // Tracé simplifié (Douglas-Peucker) du contour officiel de la France métropolitaine
  // (IGN / Etalab, via gregoiredavid/france-geojson, "métropole-version-simplifiée"),
  // projeté en équirectangulaire avec correction cos(latitude) — mêmes paramètres que
  // ceux utilisés pour placer les points (ville de départ, étapes) sur la carte.
  
  function projectLonLat(lon, lat){
    var p = FRANCE_MAP.proj;
    var x = lon * p.cosLat0 * p.scale + p.offX;
    var y = -lat * p.scale + p.offY;
    return [x, y];
  }
  /* ---------- STATE ---------- */
  var radiusMode = 'km';
  var lastNorm = null; // évite de retomber sur la même première étape deux fois de suite
  var rouletteTimer = null;

  var els = {
    form: document.getElementById('form'),
    cityField: document.getElementById('city-field'),
    city: document.getElementById('city'),
    citySuggest: document.getElementById('city-suggest'),
    cityError: document.getElementById('city-error'),
    datesField: document.getElementById('dates-field'),
    dateStart: document.getElementById('date-start'),
    dateEnd: document.getElementById('date-end'),
    durationHint: document.getElementById('duration-hint'),
    datesError: document.getElementById('dates-error'),
    tentToggle: document.getElementById('tent-toggle'),
    budget: document.getElementById('budget'),
    budgetHint: document.getElementById('budget-hint'),
    transport: document.getElementById('transport'),
    radius: document.getElementById('radius'),
    radiusUnit: document.getElementById('radius-unit'),
    radiusValueWrap: document.getElementById('radius-value-wrap'),
    radiusValueDisplay: document.getElementById('radius-value-display'),
    radiusDec: document.getElementById('radius-dec'),
    radiusInc: document.getElementById('radius-inc'),
    minDistanceField: document.getElementById('min-distance-field'),
    minDistance: document.getElementById('min-distance'),
    minDistanceDec: document.getElementById('min-distance-dec'),
    minDistanceInc: document.getElementById('min-distance-inc'),
    maxDistance: document.getElementById('max-distance'),
    maxDistanceDec: document.getElementById('max-distance-dec'),
    maxDistanceInc: document.getElementById('max-distance-inc'),
    minDistanceError: document.getElementById('min-distance-error'),
    modeKm: document.getElementById('mode-km'),
    modeH: document.getElementById('mode-h'),
    clock: document.getElementById('clock'),
    reveal: document.getElementById('reveal'),
    compass: document.getElementById('compass'),
    rouletteLabel: document.getElementById('roulette-label'),
    rouletteName: document.getElementById('roulette-name'),
    rouletteClue: document.getElementById('roulette-clue'),
    stamp: document.getElementById('stamp'),
    revealReal: document.getElementById('reveal-real'),
    revealRegion: document.getElementById('reveal-region'),
    mapCard: document.getElementById('map-card'),
    mapSvgWrap: document.getElementById('map-svg-wrap'),
    timeline: document.getElementById('timeline'),
    timelineStats: document.getElementById('timeline-stats'),
    days: document.getElementById('days'),
    packCard: document.getElementById('pack-card'),
    packProgress: document.getElementById('pack-progress'),
    packSub: document.getElementById('pack-sub'),
    packGrid: document.getElementById('pack-grid'),
    againRow: document.getElementById('again-row'),
    againBtn: document.getElementById('again-btn'),
    launchBtn: document.getElementById('launch-btn'),
    tollToggle: document.getElementById('toll-toggle')
  };

  // Les données sont chargées : on peut activer la recherche de ville.
  els.city.disabled = false;
  els.city.placeholder = 'Ex. Lyon ou 69001';

  function tickClock(){
    var d = new Date();
    els.clock.textContent = d.toLocaleDateString('fr-FR',{weekday:'long', day:'numeric', month:'long'});
  }
  tickClock();

  /* ---------- DATES DU SÉJOUR ---------- */
  var MAX_TRIP_DAYS = 21;
  var MAX_STOPS = 15; // nombre maximum de villes-étapes distinctes sur un même trajet
  function isoDate(d){
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function addDays(d, n){
    var r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }
  function parseIsoDate(s){
    if(!s) return null;
    var parts = s.split('-');
    if(parts.length !== 3) return null;
    return new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
  }
  function formatFrDate(iso){
    var d = parseIsoDate(iso);
    if(!d) return '';
    return d.toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
  }
  (function initDates(){
    var today = new Date();
    today.setHours(0,0,0,0);
    var defaultStart = today; // par défaut, un départ aujourd'hui
    var defaultEnd = addDays(defaultStart, 2); // par défaut, un séjour de 3 jours / 2 nuits
    els.dateStart.min = isoDate(today);
    els.dateStart.value = isoDate(defaultStart);
    els.dateEnd.min = isoDate(defaultStart); // même jour autorisé (virée sans nuitée)
    els.dateEnd.value = isoDate(defaultEnd);
  })();
  function clearDatesError(){
    els.datesField.classList.remove('invalid');
    els.datesError.classList.remove('show');
  }
  // Convention standard (hôtellerie/voyage) : le nombre de nuits est l'écart en jours calendaires
  // entre arrivée et retour (0 si même jour = virée sans nuitée) ; le nombre de "jours" du séjour
  // est nuits + 1 (le jour d'arrivée compte, celui de retour aussi). Ex. du 7 au 9 = 2 nuits, 3 jours.
  function tripNightsAndDays(start, end){
    var rawNights = Math.round((end - start) / 86400000);
    var nights = Math.max(0, Math.min(MAX_TRIP_DAYS - 1, rawNights));
    return { nights: nights, days: nights + 1, capped: nights < rawNights };
  }
  function updateDatesHint(){
    var start = parseIsoDate(els.dateStart.value);
    var end = parseIsoDate(els.dateEnd.value);
    if(start && end && end >= start){
      els.dateEnd.min = isoDate(start);
      var t = tripNightsAndDays(start, end);
      var label = t.nights === 0
        ? '1 jour (aller-retour, sans nuitée)'
        : t.days + ' jours (' + t.nights + (t.nights === 1 ? ' nuit' : ' nuits') + ')';
      els.durationHint.textContent = label + (t.capped ? ' — ' + MAX_TRIP_DAYS + ' jours max' : '');
      clearDatesError();
    } else {
      els.durationHint.textContent = '—';
    }
  }
  els.dateStart.addEventListener('change', function(){
    var start = parseIsoDate(els.dateStart.value);
    var end = parseIsoDate(els.dateEnd.value);
    if(start){
      els.dateEnd.min = isoDate(start);
      if(!end || end < start){ els.dateEnd.value = isoDate(addDays(start,2)); } // 3 jours / 2 nuits par défaut
    }
    updateDatesHint();
  });
  els.dateEnd.addEventListener('change', updateDatesHint);
  updateDatesHint();
  function getTripDays(){
    var start = parseIsoDate(els.dateStart.value);
    var end = parseIsoDate(els.dateEnd.value);
    if(!start || !end || end < start) return null;
    return tripNightsAndDays(start, end).days;
  }

  /* ---------- CITY VALIDATION ---------- */
  function clearCityError(){
    els.cityField.classList.remove('invalid');
    els.cityError.classList.remove('show');
  }
  function showCityError(message){
    els.cityError.textContent = message;
    els.cityField.classList.add('invalid');
    els.cityError.classList.add('show');
    els.cityField.classList.remove('shake');
    void els.cityField.offsetWidth; // restart shake animation
    els.cityField.classList.add('shake');
    els.city.focus();
  }

  /* ---------- MIN-DISTANCE VALIDATION ---------- */
  function clearMinDistanceError(){
    els.minDistanceField.classList.remove('invalid');
    els.minDistanceError.classList.remove('show');
  }
  function showMinDistanceError(message){
    els.minDistanceError.textContent = message;
    els.minDistanceField.classList.add('invalid');
    els.minDistanceError.classList.add('show');
    els.minDistanceField.classList.remove('shake');
    void els.minDistanceField.offsetWidth;
    els.minDistanceField.classList.add('shake');
    els.minDistance.focus();
  }

  /* ---------- CITY AUTOCOMPLETE (nom ou code postal) ---------- */
  var selectedCity = null; // {name, cp, lat, lon} — n'est posé qu'en choisissant une suggestion
  var currentSuggestions = [];
  var activeSuggestIndex = -1;

  function formatCpBadge(r){
    return r.allCps.length > 1 ? (r.cp + ' +' + (r.allCps.length - 1)) : r.cp;
  }
  function renderSuggestions(results){
    els.citySuggest.innerHTML = '';
    currentSuggestions = results;
    activeSuggestIndex = -1;
    if(results.length === 0){
      els.citySuggest.classList.remove('show');
      els.city.setAttribute('aria-expanded','false');
      return;
    }
    results.forEach(function(r, idx){
      var li = document.createElement('li');
      li.className = 'suggest-item';
      li.id = 'city-opt-'+idx;
      li.setAttribute('role','option');
      li.setAttribute('aria-selected','false');
      var nameSpan = document.createElement('span');
      nameSpan.className = 'suggest-name';
      nameSpan.textContent = r.name;
      var cpSpan = document.createElement('span');
      cpSpan.className = 'suggest-cp';
      cpSpan.textContent = formatCpBadge(r);
      li.appendChild(nameSpan);
      li.appendChild(cpSpan);
      li.addEventListener('mousedown', function(e){ e.preventDefault(); selectCommune(r); });
      els.citySuggest.appendChild(li);
    });
    els.citySuggest.classList.add('show');
    els.city.setAttribute('aria-expanded','true');
  }
  function selectCommune(r){
    selectedCity = { name:r.name, cp:r.cp, lat:r.lat, lon:r.lon, dept:r.dept };
    els.city.value = r.name + ' (' + r.cp + ')';
    hideSuggestions();
    clearCityError();
  }
  function hideSuggestions(){
    els.citySuggest.classList.remove('show');
    els.citySuggest.innerHTML = '';
    currentSuggestions = [];
    activeSuggestIndex = -1;
    els.city.setAttribute('aria-expanded','false');
  }
  function updateActiveSuggest(){
    var items = els.citySuggest.querySelectorAll('.suggest-item');
    items.forEach(function(it, i){
      var active = i === activeSuggestIndex;
      it.classList.toggle('active', active);
      it.setAttribute('aria-selected', active ? 'true':'false');
      if(active) it.scrollIntoView({block:'nearest'});
    });
  }

  els.city.addEventListener('input', function(){
    selectedCity = null;
    if(els.city.value.trim()) clearCityError();
    renderSuggestions(searchCommunes(els.city.value, 8));
  });
  els.city.addEventListener('keydown', function(e){
    if(!els.citySuggest.classList.contains('show')) return;
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      activeSuggestIndex = Math.min(activeSuggestIndex+1, currentSuggestions.length-1);
      updateActiveSuggest();
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      activeSuggestIndex = Math.max(activeSuggestIndex-1, 0);
      updateActiveSuggest();
    } else if(e.key === 'Enter'){
      if(activeSuggestIndex >= 0 && currentSuggestions[activeSuggestIndex]){
        e.preventDefault();
        selectCommune(currentSuggestions[activeSuggestIndex]);
      }
    } else if(e.key === 'Escape'){
      hideSuggestions();
    }
  });
  els.city.addEventListener('blur', function(){ setTimeout(hideSuggestions, 120); });

  /* ---------- RADIUS MODE TOGGLE ---------- */
  // En mode heures, le champ affiche directement la durée mise en forme (ex. "4h30") par-dessus
  // le nombre décimal brut (ex. "4.5") — voir .radius-value-display en CSS — plutôt que de
  // l'indiquer seulement à côté. Le texte d'unité n'a donc plus besoin de répéter le "h".
  function updateRadiusUnitLabel(){
    if(radiusMode === 'h'){
      var h = parseFloat(els.radius.value) || 0;
      els.radiusValueDisplay.textContent = fmtHours(h);
      els.radiusValueWrap.classList.add('show-duration');
      els.radiusUnit.textContent = 'de trajet retour max';
    } else {
      els.radiusValueWrap.classList.remove('show-duration');
      els.radiusUnit.textContent = 'km autour du départ';
    }
  }
  function setMode(mode){
    radiusMode = mode;
    els.modeKm.setAttribute('aria-pressed', mode==='km');
    els.modeH.setAttribute('aria-pressed', mode==='h');
    if(mode==='km'){
      els.radius.value = 300; els.radius.min=20; els.radius.max=1200; els.radius.step=10;
    } else {
      els.radius.value = 4; els.radius.min=0.5; els.radius.max=12; els.radius.step=0.5;
    }
    updateRadiusUnitLabel();
  }
  els.modeKm.addEventListener('click', function(){ setMode('km'); });
  els.modeH.addEventListener('click', function(){ setMode('h'); });
  els.radius.addEventListener('input', updateRadiusUnitLabel);
  // En mode heures, le nombre décimal réel de l'input est rendu invisible (voir .show-duration
  // en CSS) : taper dessus au clavier ne montrerait rien d'utile, et permettrait de sélectionner
  // ce texte caché. On bloque donc la saisie clavier directe, en ne laissant passer que les
  // touches qui pilotent le pas de 0,5h (flèches haut/bas) et la navigation (Tab) — l'ajustement
  // de la valeur reste possible via ces flèches ou via les boutons +/- natifs du champ.
  els.radius.addEventListener('keydown', function(e){
    if(radiusMode !== 'h') return;
    var allowed = ['Tab','ArrowUp','ArrowDown','Escape'];
    if(allowed.indexOf(e.key) === -1){ e.preventDefault(); }
  });
  els.radius.addEventListener('paste', function(e){ if(radiusMode === 'h') e.preventDefault(); });
  // Boutons +/- toujours tactiles, indépendants des flèches natives du champ (peu fiables, voire
  // absentes, sur mobile) et du champ lui-même (invisible en mode heures). Seul vrai moyen
  // d'ajuster la valeur au doigt.
  // Réutilisé par tous les champs numériques du formulaire équipés de boutons +/- (rayon, distance
  // min/max) : incrémente/décrémente comme le ferait la flèche native, en respectant step/min/max.
  function stepNumberField(el, dir){
    var step = parseFloat(el.step) || 1;
    var min = parseFloat(el.min), max = parseFloat(el.max);
    var cur = parseFloat(el.value);
    if(isNaN(cur)) cur = min; // champ vide ("Aucun minimum"...) : on part du plancher du champ
    var next = Math.min(max, Math.max(min, cur + dir*step));
    next = Math.round(next*100)/100; // évite les artefacts d'arrondi flottant (ex. 0.5+0.1*3)
    el.value = next;
    el.dispatchEvent(new Event('input', {bubbles:true}));
  }
  function stepRadius(dir){ stepNumberField(els.radius, dir); }
  els.radiusDec.addEventListener('click', function(){ stepRadius(-1); });
  els.radiusInc.addEventListener('click', function(){ stepRadius(1); });
  els.minDistanceDec.addEventListener('click', function(){ stepNumberField(els.minDistance, -1); });
  els.minDistanceInc.addEventListener('click', function(){ stepNumberField(els.minDistance, 1); });
  els.maxDistanceDec.addEventListener('click', function(){ stepNumberField(els.maxDistance, -1); });
  els.maxDistanceInc.addEventListener('click', function(){ stepNumberField(els.maxDistance, 1); });

  /* ---------- FOURCHETTE DE PRIX DU BUDGET SÉLECTIONNÉ ---------- */
  // Affiche le plafond réellement utilisé pour préremplir les liens Airbnb/Booking (voir
  // buildLodgingLinks, BUDGET_PRICE_MAX) — "jusqu'à X€" reflète le filtre "0 à X€" appliqué sur
  // ces liens, pas une fourchette contiguë entre paliers.
  function updateBudgetHint(){
    var key = els.budget.value;
    var max = BUDGET_PRICE_MAX[key];
    els.budgetHint.textContent = "Jusqu'à " + max + " € / nuit (indicatif, 2 adultes) — utilisé pour préremplir les recherches Airbnb/Booking.";
  }
  els.budget.addEventListener('change', updateBudgetHint);
  updateBudgetHint();

  /* ---------- HELPERS ---------- */
  function rand(min,max){ return Math.random()*(max-min)+min; }
  // Math.round(rand(min,max)) n'est PAS uniforme sur les entiers min..max : les deux bornes
  // (min et max) ne reçoivent que la moitié de la plage de valeurs continues des entiers du
  // milieu (ex. randInt(0,5) tirait "0" deux fois moins souvent que "2" ou "3") — un vrai biais
  // qui, répété à chaque choix (pick, shuffle, nombre d'étapes...), favorisait des résultats
  // "du milieu" et cassait le hasard perçu. Math.floor donne une distribution uniforme correcte.
  function randInt(min,max){ return Math.floor(rand(min, max+1)); }
  function pick(arr){ return arr[randInt(0,arr.length-1)]; }
  function shuffle(arr){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){ var j=randInt(0,i); var t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }
  function fmtHours(h){
    var totalMin = Math.round(h*60);
    var hh = Math.floor(totalMin/60), mm = totalMin%60;
    if(hh<=0) return mm+' min';
    return hh+'h'+(mm? String(mm).padStart(2,'0'):'');
  }
  function formatEuro(n){ return (Math.round(n*10)/10).toFixed(1).replace('.',','); }

  function effectiveRadiusKm(speed){
    var v = parseFloat(els.radius.value) || (radiusMode==='km'?300:4);
    return radiusMode==='km' ? v : v*speed;
  }

  // Distance réelle (vol d'oiseau, corrigé d'un facteur route de 1,17 — même méthode que pour les péages)
  // entre deux points géolocalisés, utilisée pour choisir une destination plausible et calculer des
  // temps de trajet cohérents avec la carte, plutôt qu'une distance tirée au hasard dans le rayon choisi.
  var ROAD_FACTOR = 1.17;
  function haversineKm(lat1, lon1, lat2, lon2){
    var R = 6371;
    var toRad = function(d){ return d * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    var s = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
  }
  function roadDistanceKm(lat1, lon1, lat2, lon2){
    return haversineKm(lat1, lon1, lat2, lon2) * ROAD_FACTOR;
  }

  /* ---------- GRILLE SPATIALE & CONSTRUCTION D'ITINÉRAIRE RÉEL ---------- */
  // Index léger (cellules ~0.2°, soit ~20 km) sur les ~35 000 communes pour trouver rapidement
  // les communes réelles proches d'un point donné, sans comparer une à une (35 000 communes x
  // jusqu'à 15 étapes serait trop lent en recherche naïve).
  var COMMUNE_GRID = null;
  var GRID_CELL_DEG = 0.2;
  function gridKey(lat, lon){
    return Math.floor(lat/GRID_CELL_DEG) + '_' + Math.floor(lon/GRID_CELL_DEG);
  }
  function buildCommuneGrid(){
    COMMUNE_GRID = {};
    COMMUNES.forEach(function(c){
      var k = gridKey(c.lat, c.lon);
      (COMMUNE_GRID[k] = COMMUNE_GRID[k] || []).push(c);
    });
  }
  function findNearbyCommunes(lat, lon, minKm, maxKm, minPop){
    // 1° de latitude vaut ~111 km partout, mais 1° de longitude se rétrécit avec cos(latitude) —
    // à la latitude de la France (~42-51°N), c'est ~25-35% de moins qu'à l'équateur. Utiliser le
    // même "span" en cellules pour dx (nord-sud) et dy (est-ouest) sous-couvrait donc largement la
    // direction est-ouest : une recherche censée porter à 600 km ne portait réellement qu'à
    // ~430 km plein ouest (vérifié) — assez pour manquer la Bretagne depuis la majorité du pays.
    // Calcul séparé du span est-ouest, élargi du facteur de compression, pour couvrir le même
    // rayon réel dans toutes les directions.
    var latSpan = Math.ceil(maxKm / (GRID_CELL_DEG*111)) + 1;
    var kmPerLonDeg = Math.max(111 * Math.cos(lat * Math.PI/180), 20); // garde-fou, sans objet en France
    var lonSpan = Math.ceil(maxKm / (GRID_CELL_DEG*kmPerLonDeg)) + 1;
    var cx = Math.floor(lat/GRID_CELL_DEG), cy = Math.floor(lon/GRID_CELL_DEG);
    var out = [];
    for(var dx=-latSpan; dx<=latSpan; dx++){
      for(var dy=-lonSpan; dy<=lonSpan; dy++){
        var list = COMMUNE_GRID[(cx+dx)+'_'+(cy+dy)];
        if(!list) continue;
        for(var i=0;i<list.length;i++){
          var c = list[i];
          if(c.pop < minPop) continue;
          var d = roadDistanceKm(lat, lon, c.lat, c.lon);
          if(d>=minKm && d<=maxKm) out.push({commune:c, distKm:d});
        }
      }
    }
    return out;
  }
  // Construit un itinéraire réel par proche-en-proche : à chaque étape, on part de la position
  // courante et on choisit — avec un peu de hasard pondéré — une commune réelle non encore
  // visitée, en favorisant celles qui ont un point d'intérêt réel (FEATURED) et les plus peuplées
  // (plus probable d'y trouver un vrai commerce/logement).
  //
  // La "limite de rayon" (maxRadiusKm) ne borne QUE le tout dernier trajet — le retour vers le
  // point de départ. Sur un séjour à plusieurs étapes, le voyage peut s'éloigner bien plus loin
  // entre-temps (ex. 7 jours/6 nuits avec un rayon de retour de 300 km peut très bien pousser
  // jusqu'à 800 km puis revenir en plusieurs étapes pour que le dernier trajet reste ≤ 300 km).
  // Sur un trajet à une seule étape, en revanche, cette étape sert à la fois d'aller ET de retour :
  // la limite de rayon s'y applique donc directement, comme avant.
  //
  // `minDistanceKm` (optionnelle) impose que la première étape soit à au moins cette distance.
  // `maxDistanceKm` (optionnelle) plafonne la distance au point de départ pour TOUTE étape, à
  // n'importe quel moment du séjour — un vrai plafond, contrairement à la limite de rayon.
  function buildRealRoute(startLat, startLon, maxRadiusKm, numStops, avoidNorm, minDistanceKm, maxDistanceKm){
    var route = [];
    var used = {};
    if(avoidNorm) used[avoidNorm] = true;
    var curLat = startLat, curLon = startLon;
    var minDist = minDistanceKm || 0;
    var maxDist = maxDistanceKm || 0; // 0 = pas de plafond
    var hopCeiling = maxDist > 0 ? maxDist : 600;
    for(var i=0; i<numStops; i++){
      var isFirst = i===0;
      var isLast = !isFirst && i===numStops-1;
      var isOnlyStop = numStops === 1;
      var minHop = isFirst ? Math.max(15, minDist) : 8;
      var maxHop;
      if(isFirst && isOnlyStop){
        // Étape unique : elle sert aussi de retour, donc la limite de rayon s'y applique.
        maxHop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, maxRadiusKm) : Math.min(maxRadiusKm, hopCeiling));
      } else if(isFirst){
        maxHop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, hopCeiling) : hopCeiling);
      } else {
        maxHop = Math.max(35, Math.min(hopCeiling*0.5, 220));
      }
      // La taille de la commune n'est plus un critère d'éligibilité : un hameau de 50 habitants
      // est un candidat aussi valable qu'une grande ville, du moment qu'il reste dans le rayon de
      // recherche. Seuil très bas gardé uniquement pour écarter les artefacts de données
      // (communes à population nulle/inconnue dans la base).
      var minPop = 15;

      var candidates;
      if(isLast){
        // La limite de rayon/temps de retour ne s'applique qu'ici : quel que soit l'éloignement
        // atteint entre-temps, la dernière étape doit être choisie pour que le trajet final
        // rentre dans le rayon demandé (et dans le plafond maxDistanceKm, s'il y en a un).
        var lastCap = maxDist > 0 ? Math.min(maxRadiusKm, maxDist) : maxRadiusKm;
        candidates = findNearbyCommunes(curLat, curLon, 0, Math.max(maxHop, lastCap), minPop)
          .filter(function(x){ return !used[x.commune.norm]; })
          .filter(function(x){ return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= lastCap; });
        if(candidates.length===0){
          candidates = findNearbyCommunes(startLat, startLon, 0, lastCap, 0)
            .filter(function(x){ return !used[x.commune.norm]; });
        }
      } else {
        candidates = findNearbyCommunes(curLat, curLon, minHop, maxHop, minPop)
          .filter(function(x){ return !used[x.commune.norm]; });
        if(maxDist > 0){
          candidates = candidates.filter(function(x){ return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= maxDist; });
        }
        if(candidates.length===0){
          candidates = findNearbyCommunes(curLat, curLon, minHop, maxHop*2, 0)
            .filter(function(x){ return !used[x.commune.norm]; });
          if(maxDist > 0){
            candidates = candidates.filter(function(x){ return roadDistanceKm(x.commune.lat, x.commune.lon, startLat, startLon) <= maxDist; });
          }
        }
      }
      if(candidates.length===0) break;
      // Tirage réellement uniforme dans tout le bassin de candidats éligibles — pas de score de
      // population ni de bonus "commune avec un vrai POI" (FEATURED) ici. Testé : même un bonus
      // modeste sur ~23 000 candidats suffit à écraser le hasard dès qu'il existe ne serait-ce que
      // quelques dizaines de communes qui en bénéficient (ce qui est le cas : FEATURED ne couvre
      // que 19 départements sur 108, concentrés à 92% dans un coin de l'Est) — la Bretagne, par
      // exemple, n'était alors *jamais* tirée malgré ~5% de part légitime du bassin de candidats.
      // La découverte de vrais points d'intérêt reste au rendez-vous quand la commune tirée en a
      // (voir buildActivityOptions, qui consulte FEATURED pour la commune once choisie) — mais ça
      // n'influence plus QUI est choisi, seulement CE QUI EST PROPOSÉ une fois le lieu tiré.
      var chosen = candidates[randInt(0, candidates.length-1)];
      used[chosen.commune.norm] = true;
      route.push(chosen.commune);
      curLat = chosen.commune.lat; curLon = chosen.commune.lon;
    }
    return route;
  }
  // Répartit les nuits disponibles sur les étapes choisies : chacune a au moins 1 nuit, le reste
  // est distribué au hasard en favorisant les étapes avec de vrais points d'intérêt (pour permettre
  // plusieurs activités réelles distinctes sur place), avec un maximum de 4 nuits par étape.
  function distributeNights(route, totalNights){
    var nights = route.map(function(){ return 1; });
    var remaining = totalNights - route.length;
    var guard = 0;
    while(remaining > 0 && guard < 300){
      guard++;
      var idx = randInt(0, route.length-1);
      if(nights[idx] >= 4) continue;
      var feat = FEATURED[route[idx].norm];
      var weight = feat ? feat.pois.length + 1 : 1;
      if(Math.random() > weight/5) continue; // les étapes bien pourvues gagnent plus souvent une nuit de plus
      nights[idx]++;
      remaining--;
    }
    // Filet de sécurité : si le tirage pondéré n'a pas suffi à écouler toutes les nuits
    // (beaucoup de nuits pour peu d'étapes), on distribue le reste sans condition.
    var idx2 = 0;
    while(remaining > 0){
      nights[idx2 % nights.length]++;
      remaining--;
      idx2++;
    }
    return nights;
  }
  function lodgingCategoryLabel(budgetKey, avoidTent){
    if(budgetKey==='economique') return avoidTent ? "Auberge, chambre simple ou petit hôtel (bivouac évité)" : "Camping, bivouac ou aire naturelle (petit budget)";
    if(budgetKey==='moyen') return "Gîte, chambre d'hôtes ou hôtel 2-3★";
    return "Hôtel de charme ou location haut de gamme";
  }
  buildCommuneGrid(); // appelé ici (après la déclaration de COMMUNE_GRID ci-dessus), pas plus haut

  /* ---------- ROULETTE / REVEAL ---------- */
  function runReveal(firstStop, spinPool, onDone){
    els.stamp.classList.remove('show');
    els.revealReal.classList.remove('show');
    els.compass.classList.remove('spin');
    void els.compass.offsetWidth; // restart animation
    els.compass.classList.add('spin');
    els.rouletteLabel.textContent = 'Tirage en cours…';

    var names = shuffle(spinPool.filter(function(c){return c.norm!==firstStop.norm;})).slice(0,6).map(function(c){return c.name;});
    if(names.length===0) names.push(firstStop.name);
    names.push(firstStop.name);

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){
      els.rouletteName.textContent = firstStop.name;
      els.rouletteClue.textContent = 'Un vrai lieu vous attend.';
      finishReveal(firstStop, onDone);
      return;
    }

    var i = 0, delay = 90, step = 0;
    var totalSteps = names.length + 10;
    function tick(){
      els.rouletteName.textContent = names[i % names.length];
      els.rouletteClue.textContent = 'Direction inconnue…';
      i++; step++;
      delay = delay * 1.16;
      if(step < totalSteps){
        rouletteTimer = setTimeout(tick, delay);
      } else {
        els.rouletteName.textContent = firstStop.name;
        els.rouletteClue.textContent = 'Voici votre point de départ mystère.';
        finishReveal(firstStop, onDone);
      }
    }
    tick();
  }
  function finishReveal(firstStop, onDone){
    els.rouletteLabel.textContent = 'Destination tirée au sort';
    setTimeout(function(){
      els.stamp.classList.add('show');
      var bits = [firstStop.name];
      if(firstStop.pop) bits.push(firstStop.pop.toLocaleString('fr-FR')+' habitants');
      if(FEATURED[firstStop.norm]) bits.push(FEATURED[firstStop.norm].pois.length+' point'+(FEATURED[firstStop.norm].pois.length>1?'s':'')+" d'intérêt réel"+(FEATURED[firstStop.norm].pois.length>1?'s':'')+' repéré'+(FEATURED[firstStop.norm].pois.length>1?'s':''));
      els.revealRegion.textContent = bits.join(' · ');
      els.revealReal.classList.add('show');
      if(onDone) onDone();
    }, 250);
  }

  /* ---------- PÉAGE & RECHARGE : calcul par étape ---------- */
  // Au-delà de TOLL_MIN_DISTANCE_KM, une portion du trajet emprunterait plausiblement une autoroute
  // à péage. Le péage coché rend l'étape plus rapide (temps réduit) ; décoché, le temps annoncé
  // correspond à l'itinéraire sans péage et on indique ce qui aurait pu être gagné.
  function finalizeLeg(distanceKm, speed, transportKey, tollEnabled){
    var hours = distanceKm / speed;
    var tollInfo = null;
    var tollClass = TRANSPORT[transportKey].tollClass; // null pour le vélo, interdit sur autoroute
    if(tollClass && distanceKm >= TOLL_MIN_DISTANCE_KM){
      var rate = TOLL_RATE_BY_CLASS[tollClass];
      var amount = Math.round(distanceKm * rate * 10) / 10;
      var savedRatio = rand(0.15, 0.30);
      var savedMin = Math.round(hours * 60 * savedRatio);
      var fluxLibre = Math.random() < 0.25;
      tollInfo = { enabled: !!tollEnabled, amount: amount, fluxLibre: fluxLibre, savedMin: savedMin, tollClass: tollClass, rate: rate };
      if(tollEnabled) hours = hours * (1 - savedRatio);
    }
    var chargeInfo = null;
    var tr = TRANSPORT[transportKey];
    if(tr.electric){
      var effectiveRange = EV_RANGE_KM * EV_CHARGE_MARGIN;
      if(distanceKm > effectiveRange){
        var stops = Math.ceil(distanceKm / effectiveRange) - 1;
        if(stops > 0){
          var totalMin = stops * randInt(25, 40);
          chargeInfo = { stops: stops, minutes: totalMin };
          hours += totalMin / 60;
        }
      }
    }
    return { travelTime: fmtHours(hours), distanceKm: distanceKm, tollInfo: tollInfo, chargeInfo: chargeInfo };
  }

  /* ---------- ITINERARY BUILD ---------- */
  // Liens de recherche réels (pas une réservation ni des résultats fabriqués) : cet artefact autonome
  // ne peut pas interroger une API Airbnb/hôtel en direct (aucun appel réseau externe n'est autorisé
  // au runtime, et aucune clé d'accès n'est disponible). On construit donc des liens de recherche
  // pré-remplis avec la vraie ville, les vraies dates et un plafond de prix indicatif — ils ouvrent
  // les résultats réels et à jour sur Airbnb / Booking.
  function buildLodgingLinks(town, checkIn, checkOut, budgetKey){
    var q = encodeURIComponent(town + ', France');
    var priceMax = BUDGET_PRICE_MAX[budgetKey];
    return {
      airbnb: 'https://www.airbnb.fr/s/' + encodeURIComponent(town) + '/homes?checkin=' + checkIn + '&checkout=' + checkOut + '&adults=2&price_max=' + priceMax,
      booking: 'https://www.booking.com/searchresults.fr.html?ss=' + q + '&checkin=' + checkIn + '&checkout=' + checkOut + '&group_adults=2&no_rooms=1&nflt=price%3DEUR-0-' + priceMax + '-1'
    };
  }
  // Liens de secours (toujours utiles pendant le chargement, ou si aucune photo n'est trouvée) :
  // une recherche Wikipédia et une recherche d'images, en un clic, sans rien stocker.
  function buildPhotoLinks(placeName){
    var q = encodeURIComponent(placeName + ' France');
    return {
      wiki: 'https://fr.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(placeName) + '&go=Go',
      images: 'https://www.google.com/search?tbm=isch&q=' + q
    };
  }
  // Vraie photo du lieu : on interroge notre propre serveur (/api/photo), qui va chercher la
  // photo d'infobox de l'article Wikipédia correspondant (avec désambiguïsation par département)
  // et la met en cache côté serveur. Ici, on ne fait qu'éviter de redemander deux fois la même
  // commune pendant l'affichage (ex. plusieurs nuits au même endroit).
  var clientPhotoCache = {};
  function fetchPlacePhoto(name, dept){
    var key = name + '|' + (dept || '');
    if(!clientPhotoCache[key]){
      clientPhotoCache[key] = fetch('/api/photo?name=' + encodeURIComponent(name) + '&dept=' + encodeURIComponent(dept || ''))
        .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .catch(function(){ return { image:null, wikiUrl:null, title:null }; });
    }
    return clientPhotoCache[key];
  }
  // Vrais points d'intérêt en direct (OpenStreetMap/Overpass, via notre serveur) pour les communes
  // hors de FEATURED — la grande majorité (~34 700 sur 35 000). Mis en cache 24h côté serveur, donc
  // rarement lent en pratique après le tout premier tirage sur une commune donnée ; silencieux et
  // sans jamais bloquer l'affichage si Overpass est indisponible (voir renderDays, qui retombe sur
  // les activités génériques déjà affichées si rien n'est trouvé).
  var clientPoiCache = {};
  function fetchRealPOIs(lat, lon){
    var key = lat.toFixed(3) + ',' + lon.toFixed(3);
    if(!clientPoiCache[key]){
      clientPoiCache[key] = fetch('/api/pois?lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon))
        .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function(data){ return (data && data.pois) || []; })
        .catch(function(){ return []; });
    }
    return clientPoiCache[key];
  }
  // Choisit une étape "aller-retour" plausible pour un jour unique, ou construit un itinéraire
  // réel à plusieurs étapes (buildRealRoute) pour un séjour plus long. Les activités viennent des
  // vrais points d'intérêt (FEATURED) quand la commune en a, sinon d'une suggestion générique
  // honnête. Le logement n'est plus une description inventée : seulement une catégorie indicative
  // (voir lodgingCategoryLabel) associée à de vrais liens de recherche Airbnb / Booking.
  // Construit jusqu'à 3 suggestions d'activités pour une journée : jusqu'à 2 vraies curiosités
  // locales (POI OSM, réellement nommées) quand il y en a, une suggestion de balade/randonnée
  // (réutilisant un POI de plein air — point de vue, cascade, sommet... — quand disponible plutôt
  // qu'une formule générique), puis on complète avec d'autres suggestions génériques jusqu'à 3.
  // `poisQueue` et `genericQueue` sont mutées (consommées au fil des jours d'un même séjour pour
  // éviter les répétitions), et `genericQueue` est réapprovisionnée si elle vient à manquer.
  function buildActivityOptions(poisQueue, genericQueue){
    var options = [];
    var poiCount = Math.min(2, poisQueue.length);
    for(var i=0; i<poiCount; i++){
      var poi = poisQueue.shift();
      options.push({
        label: poi.name,
        typeLabel: POI_TYPE_LABEL[poi.type] || 'curiosité locale',
        searchName: poi.name,
        isReal: true,
        isWalk: !!WALK_POI_TYPES[poi.type]
      });
    }
    if(!options.some(function(o){ return o.isWalk; })){
      var walkIdx = -1;
      for(var j=0; j<poisQueue.length; j++){ if(WALK_POI_TYPES[poisQueue[j].type]){ walkIdx = j; break; } }
      if(walkIdx >= 0){
        var walkPoi = poisQueue.splice(walkIdx, 1)[0];
        options.push({
          label: walkPoi.name,
          typeLabel: POI_TYPE_LABEL[walkPoi.type] || 'balade',
          searchName: walkPoi.name,
          isReal: true,
          isWalk: true
        });
      } else {
        options.push({ label: 'Randonnée ou balade dans les environs', typeLabel: 'balade', isReal: false, isWalk: true });
      }
    }
    while(options.length < 3){
      if(genericQueue.length === 0){ Array.prototype.push.apply(genericQueue, shuffle(GENERIC_ACTIVITIES_NO_WALK)); }
      var g = genericQueue.shift();
      if(options.some(function(o){ return o.label === g; })) continue; // évite le doublon dans la même journée
      options.push({ label: g, typeLabel: 'à faire sur place', isReal: false, isWalk: false });
    }
    return options;
  }
  function buildItinerary(city, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, avoidNorm, minDistanceKm, maxDistanceKm){
    var speed = TRANSPORT[transportKey].speed;
    var cLat = cityCoord.lat, cLon = cityCoord.lon;
    var legs = [];
    var minDist = minDistanceKm || 0;
    var maxDist = maxDistanceKm || 0;

    if(days <= 1){
      // Jour unique : l'étape sert aussi de retour, donc la limite de rayon s'y applique
      // directement (comme pour un trajet à une seule étape dans buildRealRoute).
      var hopCeiling0 = maxDist > 0 ? maxDist : 600;
      var minHop0 = Math.max(15, minDist);
      var hop = Math.max(40, minDist > 0 ? Math.max(minDist*1.4, maxRadiusKm) : Math.min(maxRadiusKm, hopCeiling0));
      // La taille n'est plus un critère d'éligibilité (voir buildRealRoute) : seuil très bas gardé
      // uniquement pour écarter les artefacts de données.
      var candidates = findNearbyCommunes(cLat, cLon, minHop0, hop, 15).filter(function(x){ return x.commune.norm !== avoidNorm; });
      if(maxDist > 0) candidates = candidates.filter(function(x){ return x.distKm <= maxDist; });
      if(candidates.length===0){
        candidates = findNearbyCommunes(cLat, cLon, minHop0, hop*1.6, 0);
        if(maxDist > 0) candidates = candidates.filter(function(x){ return x.distKm <= maxDist; });
      }
      // Tirage uniforme, voir buildRealRoute pour le détail de pourquoi (tout score, même modeste,
      // écrase le hasard sur un aussi grand bassin de candidats).
      var stop = candidates[randInt(0, candidates.length-1)].commune;
      var featured0 = FEATURED[stop.norm];
      var poisQueue0 = featured0 ? featured0.pois.slice() : [];
      var genericQueue0 = shuffle(GENERIC_ACTIVITIES_NO_WALK);
      var activities0 = buildActivityOptions(poisQueue0, genericQueue0);
      var distOut = Math.round(roadDistanceKm(cLat, cLon, stop.lat, stop.lon));
      var distBack = Math.round(roadDistanceKm(stop.lat, stop.lon, cLat, cLon));
      legs.push(Object.assign({
        label:'Jour unique — aller-retour mystère',
        stop: stop.name,
        activities: activities0,
        needsRealPOIs: !featured0,
        lodging: null,
        isReturn:false,
        lat: stop.lat, lon: stop.lon, norm: stop.norm, pop: stop.pop, dept: stop.dept
      }, finalizeLeg(distOut, speed, transportKey, tollEnabled)));
      legs.push(Object.assign({
        label:'Retour',
        stop: city,
        activities: null,
        lodging: null,
        isReturn:true,
        lat: cLat, lon: cLon, dept: cityCoord.dept
      }, finalizeLeg(distBack, speed, transportKey, tollEnabled)));
      return legs;
    }

    var totalNights = days - 1;
    var maxPossibleStops = Math.max(1, Math.min(MAX_STOPS, totalNights));
    // Si la distance minimale demandée dépasse le rayon/temps de retour max, il faut au moins
    // 2 étapes pour pouvoir s'éloigner suffisamment PUIS revenir dans les temps sur le dernier
    // trajet (voir buildRealRoute) — sinon la contrainte serait mathématiquement impossible à
    // tenir avec une seule étape (generate() bloque déjà ce cas quand il ne reste qu'1 nuit).
    var forceMultiStop = minDist > maxRadiusKm && maxPossibleStops >= 2;
    var minStops = forceMultiStop ? 2 : (totalNights >= 3 ? Math.min(3, maxPossibleStops) : 1);
    minStops = Math.min(minStops, maxPossibleStops);
    var numStops = randInt(minStops, maxPossibleStops);
    var route = buildRealRoute(cLat, cLon, maxRadiusKm, numStops, avoidNorm, minDist, maxDist);
    if(route.length === 0) route = buildRealRoute(cLat, cLon, Math.max(maxRadiusKm, 300), 1, null, 0, maxDist);
    var nights = distributeNights(route, totalNights);

    var dayCounter = 0;
    var prevLat = cLat, prevLon = cLon;
    route.forEach(function(commune, stopIdx){
      var nightsHere = nights[stopIdx];
      var featured = FEATURED[commune.norm];
      var poisQueue = featured ? featured.pois.slice() : [];
      var genericQueue = shuffle(GENERIC_ACTIVITIES_NO_WALK);
      for(var n=0; n<nightsHere; n++){
        dayCounter++;
        var distanceKm = n===0 ? Math.round(roadDistanceKm(prevLat, prevLon, commune.lat, commune.lon)) : Math.round(rand(3,14));
        var legInfo = finalizeLeg(distanceKm, speed, transportKey, tollEnabled);
        var activities = buildActivityOptions(poisQueue, genericQueue);
        var checkIn = isoDate(addDays(tripStart, dayCounter-1));
        var checkOut = isoDate(addDays(tripStart, dayCounter));
        legs.push(Object.assign({
          label: 'Jour '+dayCounter + (nightsHere>1 ? ' ('+(n+1)+'/'+nightsHere+' à '+commune.name+')' : ''),
          stop: commune.name,
          activities: activities,
          needsRealPOIs: !featured,
          lodging: lodgingCategoryLabel(budgetKey, avoidTent),
          checkIn: checkIn, checkOut: checkOut,
          lodgingLinks: buildLodgingLinks(commune.name, checkIn, checkOut, budgetKey),
          isReturn:false,
          lat: commune.lat, lon: commune.lon, norm: commune.norm, pop: commune.pop, dept: commune.dept
        }, legInfo));
      }
      prevLat = commune.lat; prevLon = commune.lon;
    });

    dayCounter++;
    var distBackKm = Math.round(roadDistanceKm(prevLat, prevLon, cLat, cLon));
    legs.push(Object.assign({
      label: 'Jour '+dayCounter+' — retour',
      stop: city,
      activities: null,
      lodging: null,
      isReturn:true,
      lat: cLat, lon: cLon, dept: cityCoord.dept
    }, finalizeLeg(distBackKm, speed, transportKey, tollEnabled)));

    return legs;
  }

  // Remplit (ou remplace intégralement le contenu de) `actList` avec des cartes d'activité pour
  // `activities`. Réutilisée à la fois pour l'affichage initial (activités FEATURED ou génériques,
  // disponibles immédiatement) et pour la mise à jour asynchrone quand de vrais points d'intérêt
  // arrivent d'Overpass (voir plus bas) — le rendu d'une carte est identique dans les deux cas.
  function renderActivityCards(actList, activities, dept){
    actList.innerHTML = '';
    activities.forEach(function(opt){
      var card = document.createElement('div');
      card.className = 'activity-card';
      card.innerHTML =
        '<div class="activity-card-visual">'+icon(opt.isWalk ? 'walk' : 'spark')+'</div>'+
        '<div class="activity-card-body">'+
          '<div class="activity-card-title">'+opt.label+'</div>'+
          '<div class="activity-card-type">'+opt.typeLabel+'</div>'+
        '</div>';
      actList.appendChild(card);
      // Pour une vraie curiosité nommée (POI OSM), on tente de récupérer sa propre photo
      // Wikipédia (ex. l'intérieur d'un musée, le paysage d'un point de vue) — plutôt que la
      // photo générale de la commune. Silencieux si rien n'est trouvé : l'icône reste affichée.
      if(opt.isReal && opt.searchName){
        fetchPlacePhoto(opt.searchName, dept).then(function(cardEl, label){
          return function(data){
            if(!data || !data.image) return;
            var fullUrl = data.imageFull || data.image;
            var wikiUrl = data.wikiUrl;
            var visual = cardEl.querySelector('.activity-card-visual');
            if(!visual) return;
            visual.innerHTML = '<img class="activity-card-img" src="'+data.image+'" alt="'+label+'" referrerpolicy="no-referrer">';
            cardEl.classList.add('has-image');
            var im = visual.querySelector('.activity-card-img');
            im.addEventListener('error', function(){
              cardEl.classList.remove('has-image');
              visual.innerHTML = icon('spark');
            });
            visual.addEventListener('click', function(){ openLightbox(fullUrl, label, wikiUrl); });
          };
        }(card, opt.label));
      }
    });
  }

  /* ---------- RENDER: DAYS ---------- */
  function renderDays(legs, city){
    els.days.innerHTML = '';
    var totalKm = 0;
    legs.forEach(function(leg, idx){
      totalKm += leg.distanceKm || 0;
      var card = document.createElement('div');
      card.className = 'day-card';
      card.style.animationDelay = (idx*0.09)+'s';

      var badge = document.createElement('div');
      badge.className = 'day-badge';
      var num = document.createElement('div');
      num.className = 'num' + (leg.isReturn? ' final':'');
      num.textContent = leg.isReturn ? '⟲' : String(idx+1);
      badge.appendChild(num);
      if(idx < legs.length-1){
        var line = document.createElement('div');
        line.className = 'line';
        badge.appendChild(line);
      }
      card.appendChild(badge);

      var body = document.createElement('div');
      body.className = 'day-body';

      var top = document.createElement('div');
      top.className = 'day-top';
      var h3 = document.createElement('h3');
      h3.textContent = leg.label;
      var rt = document.createElement('div');
      rt.className = 'route-time';
      rt.innerHTML = '~ '+leg.travelTime+' de route · '+leg.distanceKm+' km';
      top.appendChild(h3); top.appendChild(rt);
      body.appendChild(top);

      var stopEl = document.createElement('div');
      stopEl.className = 'day-stop';
      stopEl.textContent = leg.isReturn ? ('Retour vers ' + leg.stop) : ('Étape mystère : ' + leg.stop);
      body.appendChild(stopEl);

      if(leg.stop){
        var photos = buildPhotoLinks(leg.stop);
        var tile = document.createElement('div');
        tile.className = 'photo-tile';
        tile.innerHTML =
          '<a class="photo-tile-main" href="'+photos.images+'" target="_blank" rel="noopener">'+
            '<span class="photo-tile-icon">'+icon('camera')+'</span>'+
            '<span class="photo-tile-text">'+
              '<span class="photo-tile-title">Voir '+leg.stop+' en photo</span>'+
              '<span class="photo-tile-sub">Recherche d’une vraie photo…</span>'+
            '</span>'+
          '</a>'+
          '<a class="photo-tile-wiki" href="'+photos.wiki+'" target="_blank" rel="noopener">Wikipédia ↗</a>';
        body.appendChild(tile);

        fetchPlacePhoto(leg.stop, leg.dept).then(function(stopName, tileEl, photoLinks){
          return function(data){
            if(data && data.image){
              var articleUrl = data.wikiUrl || photoLinks.wiki;
              var fullUrl = data.imageFull || data.image;
              tileEl.className = 'photo-tile has-image';
              tileEl.innerHTML =
                '<button type="button" class="photo-tile-imgwrap" aria-label="Agrandir la photo de '+stopName+'">'+
                  '<img class="photo-tile-img" src="'+data.image+'" alt="'+stopName+'" referrerpolicy="no-referrer">'+
                  '<span class="photo-tile-zoom">'+icon('zoom')+'</span>'+
                '</button>'+
                '<div class="photo-tile-caption">'+
                  '<span class="photo-tile-text">'+
                    '<span class="photo-tile-title">'+stopName+'</span>'+
                    '<span class="photo-tile-sub">Photo réelle · © Wikimedia Commons</span>'+
                  '</span>'+
                  '<a class="photo-tile-wiki" href="'+articleUrl+'" target="_blank" rel="noopener">Wikipédia ↗</a>'+
                '</div>';
              // Filet de sécurité : si l'URL d'image renvoyée par Wikipédia échoue quand même
              // au chargement (lien mort, hotlink refusé...), on retombe sur la tuile de secours
              // plutôt que de laisser une icône d'image cassée affichée.
              var imgEl = tileEl.querySelector('.photo-tile-img');
              if(imgEl){
                imgEl.onerror = function(){
                  tileEl.className = 'photo-tile';
                  tileEl.innerHTML =
                    '<a class="photo-tile-main" href="'+photoLinks.images+'" target="_blank" rel="noopener">'+
                      '<span class="photo-tile-icon">'+icon('camera')+'</span>'+
                      '<span class="photo-tile-text">'+
                        '<span class="photo-tile-title">Voir '+stopName+' en photo</span>'+
                        '<span class="photo-tile-sub">Image indisponible — recherche d’images en direct</span>'+
                      '</span>'+
                    '</a>'+
                    '<a class="photo-tile-wiki" href="'+articleUrl+'" target="_blank" rel="noopener">Wikipédia ↗</a>';
                };
              }
              var imgWrapBtn = tileEl.querySelector('.photo-tile-imgwrap');
              if(imgWrapBtn){
                imgWrapBtn.addEventListener('click', function(){ openLightbox(fullUrl, stopName, articleUrl); });
              }
            } else {
              var sub = tileEl.querySelector('.photo-tile-sub');
              if(sub) sub.textContent = 'Aucune photo trouvée sur Wikipédia pour ce lieu';
            }
          };
        }(leg.stop, tile, photos));
      }

      if(leg.tollInfo){
        var t = leg.tollInfo;
        var barrierTxt = t.fluxLibre ? 'péage à flux libre, sans barrière (facturation automatique par caméra)' : 'péage classique avec barrière';
        var amountTxt = formatEuro(t.amount);
        var tollRow = document.createElement('div');
        tollRow.className = 'day-row';
        var tollTxt = t.enabled
          ? ('Péage estimé : ~'+amountTxt+' € ('+barrierTxt+') — vous gagnez environ '+t.savedMin+' min par rapport à un trajet sans péage.')
          : ('Sans péage (option décochée) : vous auriez pu gagner environ '+t.savedMin+' min en autoroute (~'+amountTxt+' €, '+barrierTxt+').');
        tollRow.innerHTML = icon('toll') + '<span><span class="lbl">Péage (barème ASF 2026)</span>'+tollTxt+'</span>';
        body.appendChild(tollRow);
      }
      if(leg.chargeInfo){
        var c = leg.chargeInfo;
        var chargeRow = document.createElement('div');
        chargeRow.className = 'day-row';
        chargeRow.innerHTML = icon('plug') + '<span><span class="lbl">Recharge électrique</span>'+c.stops+' pause'+(c.stops>1?'s':'')+' recharge estimée'+(c.stops>1?'s':'')+' (~'+c.minutes+' min au total) sur borne rapide.</span>';
        body.appendChild(chargeRow);
      }
      if(leg.activities && leg.activities.length){
        var actLabelRow = document.createElement('div');
        actLabelRow.className = 'day-row';
        actLabelRow.innerHTML = icon('spark') + '<span class="lbl">Activités possibles — au choix</span>';
        body.appendChild(actLabelRow);

        var actList = document.createElement('div');
        actList.className = 'activity-options';
        renderActivityCards(actList, leg.activities, leg.dept);
        body.appendChild(actList);

        // Cette commune n'a pas de POI répertorié dans FEATURED (la grande majorité des communes) :
        // on tente en tâche de fond de récupérer de vraies curiosités locales via OpenStreetMap
        // plutôt que de se contenter des suggestions génériques déjà affichées ci-dessus. Si
        // Overpass ne répond rien (indisponible, aucun résultat...), les activités génériques
        // restent affichées telles quelles — aucune erreur visible, juste pas de mise à jour.
        if(leg.needsRealPOIs && leg.lat != null && leg.lon != null){
          fetchRealPOIs(leg.lat, leg.lon).then(function(actListEl, dept){
            return function(pois){
              if(!pois || !pois.length) return;
              var poisQueue = shuffle(pois);
              var genericQueue = shuffle(GENERIC_ACTIVITIES_NO_WALK);
              var freshActivities = buildActivityOptions(poisQueue, genericQueue);
              renderActivityCards(actListEl, freshActivities, dept);
            };
          }(actList, leg.dept));
        }
      }
      if(leg.lodging){
        var lodgeRow = document.createElement('div');
        lodgeRow.className = 'day-row';
        lodgeRow.innerHTML = icon('bed') + '<span><span class="lbl">Type de logement</span>'+leg.lodging+'</span>';
        body.appendChild(lodgeRow);

        if(leg.lodgingLinks){
          var linksRow = document.createElement('div');
          linksRow.className = 'day-row';
          linksRow.innerHTML = icon('search') +
            '<span><span class="lbl">Trouver un vrai logement · '+formatFrDate(leg.checkIn)+'</span>'+
            '<span class="lodging-links">'+
              '<a href="'+leg.lodgingLinks.airbnb+'" target="_blank" rel="noopener" class="lodging-link">Airbnb ↗</a>'+
              '<a href="'+leg.lodgingLinks.booking+'" target="_blank" rel="noopener" class="lodging-link">Booking.com ↗</a>'+
            '</span></span>';
          body.appendChild(linksRow);
        }
      }
      if(leg.isReturn){
        var homeRow = document.createElement('div');
        homeRow.className = 'day-row';
        homeRow.innerHTML = icon('clock') + '<span><span class="lbl">Fin de mission</span>Retour à la maison, road trip mystère bouclé.</span>';
        body.appendChild(homeRow);
      }

      card.appendChild(body);
      els.days.appendChild(card);
    });

    var nights = legs.filter(function(l){return l.lodging;}).length;
    var villes = {};
    legs.forEach(function(l){ if(!l.isReturn) villes[l.stop]=true; });
    var statsHtml =
      '<span><b>'+legs.length+'</b> jours</span>'+
      '<span><b>'+Object.keys(villes).length+'</b> villes</span>'+
      '<span><b>'+nights+'</b> nuitées</span>'+
      '<span><b>~'+totalKm+' km</b> au total</span>';
    var tollLegs = legs.filter(function(l){return l.tollInfo;});
    if(tollLegs.length){
      var tollSum = tollLegs.reduce(function(s,l){return s+l.tollInfo.amount;},0);
      statsHtml += tollLegs[0].tollInfo.enabled
        ? '<span><b>~'+formatEuro(tollSum)+' €</b> de péage estimé</span>'
        : '<span><b>~'+formatEuro(tollSum)+' €</b> de péage évités</span>';
    }
    els.timelineStats.innerHTML = statsHtml;
  }

  /* ---------- RENDER: MAP ---------- */
  // Les 11 communes les plus peuplées de France (source : communes.txt, donc mêmes coordonnées
  // que le reste de la carte), affichées en repère discret sur la carte pour aider à se situer —
  // ce ne sont pas des destinations, juste un fond de carte familier.
  var MAJOR_CITIES = [
    {name:'Paris', lat:48.8589, lon:2.347},
    {name:'Marseille', lat:43.2803, lon:5.3806},
    {name:'Lyon', lat:45.758, lon:4.8351},
    {name:'Toulouse', lat:43.6007, lon:1.4328},
    {name:'Nice', lat:43.7032, lon:7.2528},
    {name:'Nantes', lat:47.2382, lon:-1.5603},
    {name:'Montpellier', lat:43.61, lon:3.8742},
    {name:'Strasbourg', lat:48.5691, lon:7.7621},
    {name:'Bordeaux', lat:44.8624, lon:-0.5848},
    {name:'Lille', lat:50.6311, lon:3.0468},
    {name:'Rennes', lat:48.1159, lon:-1.6884}
  ];
  function renderMap(legs, city, cityCoord){
    var vb = FRANCE_MAP.viewBox;
    var startPt = (cityCoord && cityCoord.lat!=null && cityCoord.lon!=null) ? projectLonLat(cityCoord.lon, cityCoord.lat) : null;
    var legPts = legs.map(function(leg){
      return (leg.lat!=null && leg.lon!=null) ? projectLonLat(leg.lon, leg.lat) : null;
    });

    // Évite que deux points quasi identiques (ex. deux étapes du même hameau) se recouvrent pile.
    var placed = startPt ? [startPt] : [];
    function declutter(pt){
      var tries = 0;
      while(tries < 8){
        var tooClose = placed.some(function(p){ return Math.hypot(p[0]-pt[0], p[1]-pt[1]) < 11; });
        if(!tooClose) break;
        var angle = tries * 2.4;
        pt = [pt[0] + Math.cos(angle)*12, pt[1] + Math.sin(angle)*12];
        tries++;
      }
      placed.push(pt);
      return pt;
    }
    legPts.forEach(function(pt, idx){ if(pt) legPts[idx] = declutter(pt); });

    // Zoome la carte sur la zone du trajet plutôt que d'afficher toute la France à chaque fois —
    // beaucoup plus lisible pour un séjour local que de chercher un petit tracé perdu dans le pays.
    var routePoints = (startPt ? [startPt] : []).concat(legPts.filter(Boolean));
    var cropVb = { x:0, y:0, W:vb.W, H:vb.H };
    if(routePoints.length){
      var minX = Math.min.apply(null, routePoints.map(function(p){return p[0];}));
      var maxX = Math.max.apply(null, routePoints.map(function(p){return p[0];}));
      var minY = Math.min.apply(null, routePoints.map(function(p){return p[1];}));
      var maxY = Math.max.apply(null, routePoints.map(function(p){return p[1];}));
      var routeW = maxX-minX, routeH = maxY-minY;
      // Marge généreuse : de la place pour les étiquettes (noms de ville au-dessus/en dessous des
      // épingles), pas juste pour les points eux-mêmes.
      var padX = Math.max(45, routeW*0.28), padY = Math.max(55, routeH*0.32);
      var cropX0 = minX-padX, cropY0 = minY-padY, cropW = routeW+padX*2, cropH = routeH+padY*2;
      // Zoom minimal : évite un cadrage absurde sur un trajet très local (voire une seule ville).
      var minCropW = vb.W*0.16, minCropH = vb.H*0.16;
      if(cropW < minCropW){ cropX0 -= (minCropW-cropW)/2; cropW = minCropW; }
      if(cropH < minCropH){ cropY0 -= (minCropH-cropH)/2; cropH = minCropH; }
      // Encore trop serré au goût des utilisateurs, deux fois de suite : d'abord +25%, puis encore
      // +25% par-dessus (donc ×1.5625 au total par rapport au cadrage strict trajet + marge),
      // toujours en gardant le même centre.
      var centerX = cropX0 + cropW/2, centerY = cropY0 + cropH/2;
      cropW *= 1.5625; cropH *= 1.5625;
      cropX0 = centerX - cropW/2; cropY0 = centerY - cropH/2;
      // Reste dans les limites de la carte d'origine (évite trop de vide/mer visible autour).
      cropW = Math.min(cropW, vb.W); cropH = Math.min(cropH, vb.H);
      cropX0 = Math.max(0, Math.min(cropX0, vb.W-cropW));
      cropY0 = Math.max(0, Math.min(cropY0, vb.H-cropH));
      cropVb = { x:cropX0, y:cropY0, W:cropW, H:cropH };
    }

    var routePts = startPt ? [startPt] : [];
    legs.forEach(function(leg, idx){ if(!leg.isReturn && legPts[idx]) routePts.push(legPts[idx]); });
    var routePath = routePts.length > 1
      ? 'M ' + routePts.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' L ')
      : '';

    var lastStopPt = null;
    for(var i=legs.length-1;i>=0;i--){ if(!legs[i].isReturn && legPts[i]){ lastStopPt = legPts[i]; break; } }
    var returnPath = '';
    if(lastStopPt && startPt){
      returnPath = 'M '+lastStopPt[0].toFixed(1)+' '+lastStopPt[1].toFixed(1)+' L '+startPt[0].toFixed(1)+' '+startPt[1].toFixed(1);
    }

    var pins = '';
    if(startPt){
      pins += '<g><circle cx="'+startPt[0].toFixed(1)+'" cy="'+startPt[1].toFixed(1)+'" r="7.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.2"/>' +
        '<text x="'+startPt[0].toFixed(1)+'" y="'+(startPt[1]+3.5).toFixed(1)+'" text-anchor="middle" font-size="8.5" font-weight="700" fill="var(--ink)">D</text>' +
        '<text x="'+startPt[0].toFixed(1)+'" y="'+(startPt[1]-11).toFixed(1)+'" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)" font-family="ui-sans-serif">'+(city||'Départ')+'</text></g>';
    }

    // Une seule épingle par ville distincte : les nuits successives au même endroit partagent
    // les mêmes coordonnées et ne doivent pas empiler plusieurs points identiques.
    var stopNum = 0;
    var lastStopName = null;
    legs.forEach(function(leg, idx){
      if(leg.isReturn) return; // le retour rejoint le point de départ, déjà marqué
      if(leg.stop === lastStopName) return;
      lastStopName = leg.stop;
      var p = legPts[idx];
      if(!p) return;
      stopNum++;
      pins += '<g><circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="7.5" fill="var(--accent-3)" stroke="var(--surface)" stroke-width="1.4"/>'+
        '<text x="'+p[0].toFixed(1)+'" y="'+(p[1]+3.2).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="700" fill="var(--accent-ink)">'+stopNum+'</text>'+
        '<text x="'+p[0].toFixed(1)+'" y="'+(p[1]+19).toFixed(1)+'" text-anchor="middle" font-size="10" fill="var(--ink-soft)" font-family="ui-sans-serif">'+leg.stop.split(' ').slice(0,2).join(' ')+'</text></g>';
    });
    if(returnPath && lastStopPt){
      var midX = (lastStopPt[0]+startPt[0])/2, midY = (lastStopPt[1]+startPt[1])/2;
      pins += '<text x="'+midX.toFixed(1)+'" y="'+(midY-6).toFixed(1)+'" text-anchor="middle" font-size="9" font-style="italic" fill="var(--accent)" font-family="ui-sans-serif">retour</text>';
    }

    // Repères discrets (grisés) pour aider à se situer — pas des épingles cliquables, juste un
    // fond de carte familier. Sautés s'ils tomberaient pile sur une épingle du trajet (ex. départ
    // ou étape dans l'une de ces grandes villes) pour ne pas dupliquer l'affichage.
    var majorMarks = MAJOR_CITIES.map(function(mc){
      var p = projectLonLat(mc.lon, mc.lat);
      var overlapsRoute = placed.some(function(pl){ return Math.hypot(pl[0]-p[0], pl[1]-p[1]) < 11; });
      if(overlapsRoute) return '';
      return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.6" fill="var(--ink-faint)" fill-opacity="0.55"/>'+
        '<text x="'+p[0].toFixed(1)+'" y="'+(p[1]-5).toFixed(1)+'" text-anchor="middle" font-size="7.5" fill="var(--ink-faint)" fill-opacity="0.65" font-family="ui-sans-serif">'+mc.name+'</text>';
    }).join('');

    var svg = '<svg viewBox="'+cropVb.x.toFixed(1)+' '+cropVb.y.toFixed(1)+' '+cropVb.W.toFixed(1)+' '+cropVb.H.toFixed(1)+'" width="100%" height="auto" role="img" aria-label="Carte de France, zoomée sur le trajet">'+
      '<path d="'+FRANCE_MAP.mainlandPath+'" fill="var(--accent-3)" fill-opacity="0.22" stroke="var(--line-strong)" stroke-width="1.4"/>'+
      '<path d="'+FRANCE_MAP.corsicaPath+'" fill="var(--accent-3)" fill-opacity="0.22" stroke="var(--line-strong)" stroke-width="1.4"/>'+
      majorMarks +
      (routePath ? '<path d="'+routePath+'" fill="none" stroke="var(--accent-3)" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round"/>' : '')+
      (returnPath ? '<path d="'+returnPath+'" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round"/>' : '')+
      pins +
      '</svg>';
    els.mapSvgWrap.innerHTML = svg;
  }

  /* ---------- RENDER: PACKING LIST ---------- */
  function renderPacking(budgetKey, transportKey){
    var items = [];
    items = items.concat(PACK_BASE);
    items = items.concat(TRANSPORT[transportKey].extra);
    items = items.concat(PACK_BUDGET[budgetKey]);
    // dedupe
    var seen = {};
    items = items.filter(function(it){ if(seen[it]) return false; seen[it]=true; return true; });

    els.packSub.textContent = 'Pour '+TRANSPORT[transportKey].label+', budget '+BUDGET[budgetKey].label+'.';
    els.packGrid.innerHTML = '';
    items.forEach(function(it, idx){
      var wrap = document.createElement('div');
      wrap.className = 'pack-item';
      var id = 'pack-'+idx;
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      var label = document.createElement('label');
      label.setAttribute('for', id);
      label.innerHTML = '<span class="check-box">'+icon('check')+'</span><span class="check-text"></span>';
      label.querySelector('.check-text').textContent = it;
      wrap.appendChild(input);
      wrap.appendChild(label);
      input.addEventListener('change', updatePackProgress);
      els.packGrid.appendChild(wrap);
    });
    updatePackProgress();
  }

  function updatePackProgress(){
    var boxes = els.packGrid.querySelectorAll('input[type="checkbox"]');
    var allChecked = boxes.length > 0 && Array.prototype.every.call(boxes, function(b){ return b.checked; });
    els.packProgress.classList.toggle('complete', allChecked);
  }

  /* ---------- MAIN FLOW ---------- */
  function generate(){
    var typed = els.city.value.trim();
    if(!typed){
      showCityError("Merci d'indiquer une ville de départ.");
      return;
    }
    if(!selectedCity){
      showCityError("Sélectionnez une commune dans la liste déroulante (recherche par nom ou code postal).");
      return;
    }
    var city = selectedCity.name;
    clearCityError();
    var days = getTripDays();
    if(!days){
      els.datesField.classList.add('invalid');
      els.datesError.classList.add('show');
      els.datesField.classList.remove('shake');
      void els.datesField.offsetWidth;
      els.datesField.classList.add('shake');
      els.dateStart.focus();
      return;
    }
    clearDatesError();
    var tripStart = parseIsoDate(els.dateStart.value);
    var budgetKey = els.budget.value;
    var transportKey = els.transport.value;
    var tollEnabled = els.tollToggle.checked;
    var avoidTent = els.tentToggle.checked;
    var speed = TRANSPORT[transportKey].speed;
    var maxRadiusKm = Math.max(20, effectiveRadiusKm(speed));
    var cityCoord = { lat: selectedCity.lat, lon: selectedCity.lon, dept: selectedCity.dept };

    var minDistanceKm = parseFloat(els.minDistance.value) || 0;
    var maxDistanceKm = parseFloat(els.maxDistance.value) || 0;
    var totalNights = Math.max(0, days - 1);
    clearMinDistanceError();
    if(minDistanceKm > 0 && maxDistanceKm > 0 && minDistanceKm > maxDistanceKm){
      showMinDistanceError("La distance minimale (" + minDistanceKm + " km) ne peut pas dépasser la distance maximale (" + maxDistanceKm + " km).");
      return;
    }
    if(minDistanceKm > 0 && minDistanceKm > maxRadiusKm && totalNights <= 1){
      showMinDistanceError("Impossible : avec seulement " + (totalNights === 0 ? '1 jour et aucune nuitée' : '1 nuitée') + ", on ne peut pas s'éloigner d'au moins " + minDistanceKm + " km puis revenir dans le rayon/temps de retour choisi (" + Math.round(maxRadiusKm) + " km). Augmentez la durée du séjour, réduisez la distance minimale, ou élargissez le rayon max.");
      return;
    }

    var legs = buildItinerary(city, days, budgetKey, transportKey, tollEnabled, cityCoord, avoidTent, tripStart, maxRadiusKm, lastNorm, minDistanceKm, maxDistanceKm);
    if(legs.length === 0){
      showCityError("Impossible de construire un itinéraire depuis cette ville pour l'instant — réessayez, ou élargissez le rayon.");
      return;
    }
    var firstLeg = legs[0];
    lastNorm = firstLeg.norm || null;

    // Vivier de vrais noms de communes proches, pour faire défiler la roulette avant la révélation.
    var spinRadius = Math.max(60, Math.min(maxRadiusKm, 400));
    var spinPool = findNearbyCommunes(cityCoord.lat, cityCoord.lon, 15, spinRadius, 500).map(function(x){ return x.commune; });

    els.reveal.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto':'smooth', block:'start'});
    els.mapCard.classList.remove('show');
    els.timeline.classList.remove('show');
    els.packCard.classList.remove('show');
    els.againRow.classList.remove('show');

    if(rouletteTimer) clearTimeout(rouletteTimer);

    var firstStopInfo = { name: firstLeg.stop, norm: firstLeg.norm, pop: firstLeg.pop };
    runReveal(firstStopInfo, spinPool, function(){
      renderDays(legs, city);
      renderMap(legs, city, cityCoord);
      renderPacking(budgetKey, transportKey);

      els.mapCard.classList.add('show');
      els.timeline.classList.add('show');
      els.packCard.classList.add('show');
      els.againRow.classList.add('show');
    });
  }

  els.form.addEventListener('submit', function(e){
    e.preventDefault();
    generate();
  });
  els.againBtn.addEventListener('click', generate);

})();
