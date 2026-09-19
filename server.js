// Serveur minimal : sert le dossier public/ tel quel (HTML, CSS, JS, données), plus deux routes
// API — une qui va chercher une vraie photo sur Wikipédia, une qui va chercher de vrais points
// d'intérêt sur OpenStreetMap (voir plus bas). Aucune donnée du visiteur n'est reçue ni conservée ;
// le seul état en mémoire est le cache de ces deux routes.
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const express = require('express');
const compression = require('compression');
const PDFDocument = require('pdfkit');
const PdfText = require('./lib/pdf-text.js');
const tripEngine = require('./lib/trip-engine.js');
const searchIndex = require('./lib/search-index.js');
const landGrid = require('./lib/land-grid.js'); // grille terre/mer — état exposé par GET /api/status
const tollGrid = require('./lib/toll-grid.js'); // grille des voies à péage — état exposé par GET /api/status
const TripDataCountries = require('./public/js/trip-data.js').COUNTRIES;
const TripDataTollSource = require('./public/js/trip-data.js').TOLL_SOURCE;
const TripData = require('./public/js/trip-data.js');
// Pays couverts par Visorando et portails de randonnée par pays (scripts/build-hiking-data.js -> data/hiking.json).
let HIKING_DATA = { visorandoCountries: ['FR'], portals: [] };
try { HIKING_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'hiking.json'), 'utf8')); } catch(err){ /* fichier absent : France seule */ }

const app = express();
const PORT = process.env.PORT || 3000;

// Compression gzip/brotli sur toutes les réponses (texte : HTML/CSS/JS/JSON, et surtout les
// fichiers communes-XX.txt/aliases-XX.txt sous /data — ~25 Mo au total à ce jour, voir "Sources
// des données" du README) : du texte brut compresse typiquement à 70-85%, un gain net sur le
// premier chargement du formulaire (le champ "ville de départ" reste désactivé tant que ces
// fichiers ne sont pas tous arrivés, voir buildCommunesFetches côté client). Placé tout en haut,
// avant la moindre route/middleware, pour s'appliquer à toutes les réponses sans exception.
// Exception (audit du 17/09/2026) : les gros fichiers précompressés en mémoire (voir PRECOMPRESSED_FILES) ne repassent
// jamais par la compression à la volée — i18n.js (11 Mo) coûtait ~0,85 s de CPU à CHAQUE réponse.
app.use(compression({
  filter: function(req, res){ return !res.locals.precompressed && compression.filter(req, res); }
}));

// ---------------------------------------------------------------------------------------------
// SÉCURITÉ (audit de septembre 2026)
// ---------------------------------------------------------------------------------------------
// En-têtes HTTP : CSP stricte (scripts du site seulement, plus le petit script inline de thème identifié par son
// empreinte), images des seuls hôtes utilisés (tuiles OpenStreetMap, Wikimedia), pas d'intégration dans un cadre
// tiers, HSTS, pas de détection de type MIME. 'unsafe-inline' en style : attributs style de Leaflet et de la page.
app.disable('x-powered-by');
// Derrière Apache/Passenger : IP du visiteur pour la limitation de débit (un saut de proxy). TRUST_PROXY=0 pour un
// lancement exposé directement (sans proxy, X-Forwarded-For viendrait du client et contournerait les quotas) ; à
// augmenter si un autre proxy ou un CDN est ajouté devant.
app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY || '') ? Number(process.env.TRUST_PROXY) : 1);
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'sha256-gxNfGsSxUqGFdaO1yv9YCXy/KFUQjL22jNwRkaHoeao='",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.wikimedia.org https://*.wikipedia.org",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');
app.use(function(req, res, next){
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  next();
});
// Limitation de débit en mémoire, par IP et par famille de routes (fenêtre glissante d'une minute) : empêche qu'un seul
// client sature le moteur (tirages synchrones) ou fasse bannir le serveur par Overpass, Wikipédia ou Visorando.
// search-city : 180 -> 60/min (audit du 17/09/2026) — la saisie côté client est temporisée, 60 suffit largement.
const RATE_LIMITS = [
  { prefix: '/api/search-city', max: 60 },
  { prefix: '/api/generate-trip', max: 20 },
  { prefix: '/api/export-pdf', max: 10 },
  { prefix: '/api/pois', max: 120 },
  { prefix: '/api/photo', max: 400 },
  { prefix: '/api/hike', max: 120 },
  { prefix: '/api/', max: 120 }
];
const rateBuckets = new Map();
setInterval(function(){
  const now = Date.now();
  for(const [key, hits] of rateBuckets){ if(!hits.length || now - hits[hits.length - 1] > 60000) rateBuckets.delete(key); }
}, 60000).unref();
// Chemin normalisé (audit du 17/09/2026) : Express ignore la casse des routes et Apache fusionne les barres multiples —
// « /api/Export-PDF » ou « /api//export-pdf » atteignaient la route en ne comptant que dans le quota général, et
// « /API/… » faisait planter le limiteur (aucune règle trouvée, erreur 500).
app.use('/api/', function(req, res, next){
  // Réponses propres au visiteur (langue, coordonnées, tirage) : jamais mises en commun par un proxy ou un CDN.
  res.setHeader('Cache-Control', 'no-store');
  // Requête émise par une page d'un AUTRE site, d'après le navigateur lui-même (Sec-Fetch-Site, que le script d'une page
  // ne peut pas modifier) : refusée (11e audit du 19/09/2026). Sans ce contrôle, une page tierce pouvait faire lancer
  // recherches, photos et randonnées par les navigateurs de ses visiteurs — autant d'adresses IP que de visiteurs, les
  // quotas par IP ne servaient plus à rien. Clients sans cet en-tête (outils, anciens navigateurs) : non concernés.
  if(req.get('Sec-Fetch-Site') === 'cross-site') return res.status(403).json({ error: 'cross-site request' });
  const p = ('/api/' + req.path).toLowerCase().replace(/\/{2,}/g, '/');
  const rule = RATE_LIMITS.find(r => p.startsWith(r.prefix)) || RATE_LIMITS[RATE_LIMITS.length - 1];
  // IP (vérifié le 17/09/2026) : avec « trust proxy 1 », req.ip est la dernière adresse de X-Forwarded-For, celle
  // qu'ajoute Passenger/Apache — un faux en-tête envoyé par le client ne contourne pas les quotas (testé en production).
  // Sans IP connue, toutes ces requêtes partagent la clé « inconnu » avec les MÊMES quotas que n'importe quelle IP
  // (un seul compteur commun, donc plus restrictif, jamais illimité).
  const key = (req.ip || 'inconnu') + '|' + rule.prefix;
  const now = Date.now();
  let hits = rateBuckets.get(key);
  if(!hits){ hits = []; rateBuckets.set(key, hits); }
  while(hits.length && now - hits[0] > 60000) hits.shift();
  if(hits.length >= rule.max){
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'too many requests' });
  }
  hits.push(now);
  next();
});
// Requêtes EN COURS par IP sur les routes qui appellent des services tiers (2e audit du 17/09/2026) : les limites par
// service (makeServiceLimiter) sont communes à tous — une seule adresse, avec des coordonnées toujours différentes (donc
// jamais en cache), occupait les 2 créneaux Overpass et leur file, et les autres visiteurs recevaient des listes vides.
// Chaque IP a désormais au plus `max` requêtes en cours par groupe ; les suivantes ATTENDENT leur tour (le client lance
// photos, lieux et randonnées de toutes les étapes d'un coup, jusqu'à ~90 requêtes : un refus net les perdrait). File
// par IP bornée (`queue`) et attente plafonnée (`waitMs`) : au-delà, 429 pour cette IP seule.
// 3e audit du 17/09/2026, deux corrections :
// - les plafonds par IP égalaient les plafonds globaux (LIMIT_OVERPASS 2, LIMIT_WIKIPEDIA 6) : une seule adresse pouvait
//   les occuper entièrement. Ils sont désormais une FRACTION du global (1 sur 2 Overpass, 3 sur 6 Wikipédia) ;
// - la place était rendue dès la fermeture de la connexion, alors que l'appel sortant (jusqu'à 25 s) continuait : des
//   requêtes abandonnées volontairement annulaient toute la limite. La place n'est rendue qu'à la FIN du traitement
//   (res 'finish'), ou après OUTBOUND_MAX_HOLD_MS si le client est parti — la durée du travail réel, pas celle du client.
const OUTBOUND_GROUPS = [
  { name: 'overpass', routes: ['/api/pois', '/api/hike'], max: 1, queue: 60, waitMs: 20000 },
  { name: 'photo', routes: ['/api/photo'], max: 3, queue: 150, waitMs: 20000 }
];
// 60 s (10e audit du 18/09/2026) : /api/hike peut durer 35 s (Visorando 10 s puis Overpass 25 s) et /api/photo jusqu'à
// ~60 s dans le pire enchaînement ; avec 30 s, la place était rendue pendant que le travail continuait — le plafond
// par IP était alors dépassé. Ce n'est qu'un filet : la place est normalement rendue à la fin de la réponse.
// 125 s (12e audit du 19/09/2026) : 60 s ne couvraient toujours pas /api/photo. Pire enchaînement, d'après les délais du
// code (attente du limiteur + délai de l'appel) : deux titres dans la langue du visiteur sans photo (2 × (8 + 10) s),
// résumé anglais (8 + 10 s), lien Wikidata (6 + 10 s), article local sans photo (8 + 10 s), puis article anglais avec
// photo et crédit ((8 + 10) + (8 + 8) s) = 122 s. /api/hike (35 s) et /api/pois restent en deçà.
const OUTBOUND_MAX_HOLD_MS = 125000;
const outboundByIp = new Map(); // groupe|ip -> { active, waiting: [fonction de reprise] }
app.use('/api/', function(req, res, next){
  const p = ('/api/' + req.path).toLowerCase().replace(/\/{2,}/g, '/');
  const group = OUTBOUND_GROUPS.find(g => g.routes.some(r => p === r || p.startsWith(r + '/')));
  if(!group) return next();
  const key = group.name + '|' + (req.ip || 'inconnu');
  let state = outboundByIp.get(key);
  if(!state){ state = { active: 0, waiting: [] }; outboundByIp.set(key, state); }
  let started = false, finished = false, holdTimer = null;
  function start(){
    // Client parti entre-temps (fermeture non encore traitée) : on ne lance rien, la place passe à la suivante.
    if(res.destroyed || req.socket.destroyed){ started = true; state.active++; return release(); }
    started = true;
    state.active++;
    holdTimer = setTimeout(release, OUTBOUND_MAX_HOLD_MS); // filet : appel sortant anormalement long
    holdTimer.unref();
    next();
  }
  function release(){
    if(finished) return;
    finished = true;
    if(holdTimer) clearTimeout(holdTimer);
    if(!started){ // abandonnée pendant l'attente
      const i = state.waiting.indexOf(start);
      if(i >= 0) state.waiting.splice(i, 1);
    } else {
      state.active--;
      const resume = state.waiting.shift();
      if(resume) resume();
    }
    if(state.active === 0 && state.waiting.length === 0) outboundByIp.delete(key);
  }
  // Place rendue à la FIN DU TRAITEMENT : quand la route appelle res.end() — même si le client est parti entre-temps,
  // la réponse part alors dans le vide mais l'appel sortant est bien terminé (11e audit du 19/09/2026). Avant, une
  // connexion coupée rendait la place au bout de 5 s alors que l'appel Overpass continuait jusqu'à 25 s : en coupant ses
  // requêtes, une adresse occupait plusieurs créneaux Overpass à la fois (son plafond est 1). Filet : OUTBOUND_MAX_HOLD_MS.
  const endResponse = res.end;
  res.end = function(){ release(); return endResponse.apply(this, arguments); };
  res.on('close', function(){
    if(finished || res.writableEnded) return;
    // Abandonnée PENDANT L'ATTENTE (10e audit du 18/09/2026) : retirée de la file tout de suite, son appel n'est jamais
    // lancé. Abandonnée pendant le traitement : la place est gardée jusqu'à la fin réelle de l'appel (voir res.end).
    if(!started) return release();
  });
  if(state.active < group.max) return start();
  if(state.waiting.length >= group.queue){
    finished = true;
    res.setHeader('Retry-After', '10');
    return res.status(429).json({ error: 'too many requests' });
  }
  state.waiting.push(start);
  // Attente plafonnée : une file de 150 places sans échéance gardait des sockets ouverts plusieurs minutes.
  const waitTimer = setTimeout(function(){
    if(started || finished) return;
    const i = state.waiting.indexOf(start);
    if(i >= 0) state.waiting.splice(i, 1);
    finished = true;
    if(state.active === 0 && state.waiting.length === 0) outboundByIp.delete(key);
    res.setHeader('Retry-After', '10');
    res.status(429).json({ error: 'too many requests' });
  }, group.waitMs);
  waitTimer.unref();
  res.on('finish', function(){ clearTimeout(waitTimer); });
});
// Budget de calcul GLOBAL (audit du 17/09/2026), toutes IP confondues : les quotas par IP n'empêchent pas plusieurs
// clients (ou plusieurs adresses) d'occuper le process à eux tous — tirages, exports PDF et recherches sont synchrones.
// Durée cumulée de ces calculs (cases d'une seconde sur 60 s, mémoire bornée), comparée à deux plafonds glissants :
// - CPU_BUDGETS[0] : 25 s de calcul par minute ;
// - CPU_BUDGETS[1] : 7,5 s sur 10 s — sans lui, une rafale arrivée d'un coup (24 tirages lourds acceptés avant que le
//   premier ne finisse) gelait le process ~25 s d'affilée (mesuré : /api/status sans réponse pendant 21 s) ; avec lui,
//   le gel continu reste de l'ordre de 10 s.
// Au-delà, les NOUVELLES requêtes de ces routes reçoivent 503 {error:'busy'} avec Retry-After (le temps que les calculs
// les plus anciens sortent de la fenêtre). Les requêtes déjà en cours ne sont jamais interrompues.
const CPU_BUDGETS = [{ windowS: 60, maxMs: 25000 }, { windowS: 10, maxMs: 7500 }];
const CPU_BUDGET_SLOTS = 60; // = la plus longue fenêtre
const cpuBudgetMs = new Float64Array(CPU_BUDGET_SLOTS);
const cpuBudgetSec = new Float64Array(CPU_BUDGET_SLOTS); // seconde (horloge) de chaque case, pour les purger
function cpuBudgetAdd(ms){
  const sec = Math.floor(Date.now() / 1000), i = sec % CPU_BUDGET_SLOTS;
  if(cpuBudgetSec[i] !== sec){ cpuBudgetSec[i] = sec; cpuBudgetMs[i] = 0; }
  cpuBudgetMs[i] += ms;
}
// Cases non vides de moins de windowS secondes : [âge en s, ms], plus anciennes d'abord.
function cpuBudgetSlots(windowS){
  const sec = Math.floor(Date.now() / 1000), slots = [];
  for(let i = 0; i < CPU_BUDGET_SLOTS; i++){
    const age = sec - cpuBudgetSec[i];
    if(age >= 0 && age < windowS && cpuBudgetMs[i] > 0) slots.push([age, cpuBudgetMs[i]]);
  }
  return slots.sort((x, y) => y[0] - x[0]);
}
function cpuBudgetUsedMs(windowS){
  return Math.round(cpuBudgetSlots(windowS).reduce((t, x) => t + x[1], 0));
}
// Secondes à attendre avant que tous les plafonds soient de nouveau respectés (0 = disponible).
function cpuBudgetRetryAfter(){
  let wait = 0;
  for(const budget of CPU_BUDGETS){
    const slots = cpuBudgetSlots(budget.windowS);
    let total = slots.reduce((t, x) => t + x[1], 0);
    if(total < budget.maxMs) continue;
    for(const [age, ms] of slots){
      total -= ms;
      if(total < budget.maxMs){ wait = Math.max(wait, budget.windowS - age); break; }
    }
  }
  return wait;
}
// Budget de calcul PAR IP (2e audit du 17/09/2026) : le budget global seul laissait UNE adresse l'épuiser pour tout le
// monde — 6 tirages de 4 s par minute (sous le quota de 20) suffisaient à répondre « busy » à tous les autres visiteurs.
// Chaque IP a droit, en calcul (tirages, exports PDF, recherches lentes), à 10 s par minute et 4 s par 10 s
// (CPU_BUDGETS_PER_IP) ; au-delà, 429 pour ELLE seule. Un tirage ordinaire coûte 0,1 à 1 s, le pire légitime ~4 s : un
// vrai visiteur garde de la marge. Fenêtre courte nécessaire : avec la seule limite par minute, deux tirages de 4 s
// d'une même adresse atteignaient déjà le plafond global de 7,5 s sur 10 s (mesuré) ; il faut désormais au moins deux
// adresses pour l'atteindre.
const CPU_BUDGETS_PER_IP = [{ windowS: 60, maxMs: 10000 }, { windowS: 10, maxMs: 4000 }];
const cpuBudgetByIp = new Map(); // ip -> [[seconde, ms], …] sur la dernière minute
function cpuBudgetIpEntries(ip){
  const e = cpuBudgetByIp.get(ip);
  if(!e) return null;
  const sec = Math.floor(Date.now() / 1000);
  while(e.length && sec - e[0][0] >= 60) e.shift();
  if(!e.length){ cpuBudgetByIp.delete(ip); return null; }
  return e;
}
function cpuBudgetIpAdd(ip, ms){
  const sec = Math.floor(Date.now() / 1000);
  let e = cpuBudgetIpEntries(ip);
  if(!e){ e = []; cpuBudgetByIp.set(ip, e); }
  if(e.length && e[e.length - 1][0] === sec) e[e.length - 1][1] += ms; else e.push([sec, ms]);
}
// Secondes à attendre avant que cette IP repasse sous son budget (0 = disponible).
function cpuBudgetIpRetryAfter(ip){
  const e = cpuBudgetIpEntries(ip);
  if(!e) return 0;
  const sec = Math.floor(Date.now() / 1000);
  let wait = 0;
  for(const budget of CPU_BUDGETS_PER_IP){
    const inWindow = e.filter(x => sec - x[0] < budget.windowS);
    let total = inWindow.reduce((t, x) => t + x[1], 0);
    if(total < budget.maxMs) continue;
    for(const [s0, ms] of inWindow){
      total -= ms;
      if(total < budget.maxMs){ wait = Math.max(wait, Math.max(1, budget.windowS - (sec - s0))); break; }
    }
  }
  return wait;
}
setInterval(function(){ for(const ip of Array.from(cpuBudgetByIp.keys())) cpuBudgetIpEntries(ip); }, 60000).unref();
function cpuBudgetIpOf(req){ return req.ip || 'inconnu'; }
// Durée d'un calcul imputée au budget global ET à celui de l'IP.
function cpuBudgetCharge(req, ms){
  cpuBudgetAdd(ms);
  cpuBudgetIpAdd(cpuBudgetIpOf(req), ms);
}
// Contrôle du budget de l'IP seule (recherche de ville : quelques ms, jamais refusée pour cause de charge des autres).
function cpuBudgetIpGuard(req, res, next){
  const wait = cpuBudgetIpRetryAfter(cpuBudgetIpOf(req));
  if(wait > 0){
    res.setHeader('Retry-After', String(wait));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({ error: 'too many requests' });
  }
  next();
}
function sendBusy(res, retryAfterS){
  res.setHeader('Retry-After', String(retryAfterS));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({ error: 'busy' });
}
// Placé AVANT express.json() (une requête refusée ne coûte même pas l'analyse de son corps) et de nouveau APRÈS : des
// requêtes arrivées ensemble passent toutes le premier contrôle avant qu'aucun calcul n'ait commencé.
function cpuBudgetGuard(req, res, next){
  const ipWait = cpuBudgetIpRetryAfter(cpuBudgetIpOf(req));
  if(ipWait > 0) return cpuBudgetIpGuard(req, res, next);
  const wait = cpuBudgetRetryAfter();
  if(wait > 0){
    if(Date.now() - cpuBudgetLastLog > 10000){ // une ligne toutes les 10 s au plus, même sous un flot de requêtes
      cpuBudgetLastLog = Date.now();
      console.warn('[budget] ' + cpuBudgetUsedMs(10) + ' ms de calcul sur 10 s, ' + cpuBudgetUsedMs(60) + ' ms sur 60 s : requêtes ' + JSON.stringify(req.path) + ' et suivantes refusées (503)');
    }
    return sendBusy(res, wait);
  }
  next();
}
let cpuBudgetLastLog = 0;
// Fichiers de données : le navigateur n'en charge plus aucun (recherche et tirages côté serveur). Les servir exposait
// des centaines de Mo en téléchargement libre (bundles de 226 Mo), une porte ouverte à la saturation de la bande
// passante ; les données restent publiques sur le dépôt GitHub.
// Contrôle sur le chemin DÉCODÉ et sans tenir compte de la casse : express.static décode l'URL avant de chercher le
// fichier, « /%64ata/… » ou « /data%2F… » contournaient un simple préfixe.
app.use(function(req, res, next){
  let p;
  try { p = decodeURIComponent(req.path); } catch(e){ return res.status(400).type('text/plain').send('Bad request'); }
  // Barre oblique inverse comprise (« /data%5Cfeatured.txt ») : certains systèmes de fichiers la traitent en séparateur.
  // Chemin NORMALISÉ (2e audit du 17/09/2026) : « /./data/… », « /%2e/data/… » ou « /js/../data/… » passaient le simple
  // test de préfixe, puis express.static normalisait et servait le fichier (bundle de 226 Mo compris).
  const norm = path.posix.normalize('/' + p.replace(/\\/g, '/'));
  if(/^\/+data(\/|$)/i.test(norm)) return res.status(404).type('text/plain').send('Not found');
  // Chemin décodé et normalisé, repris par le quota des gros fichiers et la précompression (9e audit du 18/09/2026).
  req.normPath = norm.replace(/\/{2,}/g, '/');
  next();
});
// Paramètres de requête : chaînes seulement. « ?name[a]=x » ou « ?name=a&name=b » donnaient un objet ou un tableau,
// converti en « [object Object] » ou « a,b » par les routes (sans danger, mais incohérent jusque dans les liens).
app.use('/api/', function(req, res, next){
  for(const k of Object.keys(req.query)){
    const v = req.query[k];
    if(typeof v !== 'string') req.query[k] = Array.isArray(v) && typeof v[0] === 'string' ? v[0] : '';
  }
  next();
});

// Code département (INSEE) -> nom, utilisé pour désambiguïser les communes homonymes sur
// Wikipédia (ex. il existe trois communes "Thoiry" : Ain, Savoie, Yvelines — l'article vaut
// alors "Thoiry (Ain)", pas "Thoiry"). Source : geo.api.gouv.fr (IGN / Etalab).
const DEPARTMENTS = {"01":"Ain","02":"Aisne","03":"Allier","04":"Alpes-de-Haute-Provence","05":"Hautes-Alpes","06":"Alpes-Maritimes","07":"Ardèche","08":"Ardennes","09":"Ariège","10":"Aube","11":"Aude","12":"Aveyron","13":"Bouches-du-Rhône","14":"Calvados","15":"Cantal","16":"Charente","17":"Charente-Maritime","18":"Cher","19":"Corrèze","2A":"Corse-du-Sud","2B":"Haute-Corse","21":"Côte-d'Or","22":"Côtes-d'Armor","23":"Creuse","24":"Dordogne","25":"Doubs","26":"Drôme","27":"Eure","28":"Eure-et-Loir","29":"Finistère","30":"Gard","31":"Haute-Garonne","32":"Gers","33":"Gironde","34":"Hérault","35":"Ille-et-Vilaine","36":"Indre","37":"Indre-et-Loire","38":"Isère","39":"Jura","40":"Landes","41":"Loir-et-Cher","42":"Loire","43":"Haute-Loire","44":"Loire-Atlantique","45":"Loiret","46":"Lot","47":"Lot-et-Garonne","48":"Lozère","49":"Maine-et-Loire","50":"Manche","51":"Marne","52":"Haute-Marne","53":"Mayenne","54":"Meurthe-et-Moselle","55":"Meuse","56":"Morbihan","57":"Moselle","58":"Nièvre","59":"Nord","60":"Oise","61":"Orne","62":"Pas-de-Calais","63":"Puy-de-Dôme","64":"Pyrénées-Atlantiques","65":"Hautes-Pyrénées","66":"Pyrénées-Orientales","67":"Bas-Rhin","68":"Haut-Rhin","69":"Rhône","70":"Haute-Saône","71":"Saône-et-Loire","72":"Sarthe","73":"Savoie","74":"Haute-Savoie","75":"Paris","76":"Seine-Maritime","77":"Seine-et-Marne","78":"Yvelines","79":"Deux-Sèvres","80":"Somme","81":"Tarn","82":"Tarn-et-Garonne","83":"Var","84":"Vaucluse","85":"Vendée","86":"Vienne","87":"Haute-Vienne","88":"Vosges","89":"Yonne","90":"Territoire de Belfort","91":"Essonne","92":"Hauts-de-Seine","93":"Seine-Saint-Denis","94":"Val-de-Marne","95":"Val-d'Oise","971":"Guadeloupe","972":"Martinique","973":"Guyane","974":"La Réunion","976":"Mayotte"};

// Cache en mémoire (process unique) : évite de refrapper Wikipédia à chaque affichage de la
// même commune. Borné à CACHE_MAX_ENTRIES entrées (voir cacheSet), sans persistance.
const photoCache = new Map();
// Caches en mémoire BORNÉS (audit de septembre 2026) : au-delà de CACHE_MAX_ENTRIES, l'entrée la plus ancienne est
// retirée — sans borne, des requêtes aux paramètres toujours différents faisaient grossir la mémoire indéfiniment.
const CACHE_MAX_ENTRIES = 5000;
function cacheSet(map, key, value){
  if(map.has(key)) map.delete(key);
  map.set(key, value);
  while(map.size > CACHE_MAX_ENTRIES) map.delete(map.keys().next().value);
}
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// Clé de cache normalisée (casse, forme Unicode, espaces) : « Ajaccio », « ajaccio » et « Ajaccio␠» ne font plus
// trois appels ni trois entrées.
function cacheKeyPart(s){
  return String(s == null ? '' : s).normalize('NFC').trim().toLowerCase();
}

// Appels sortants simultanés limités PAR SERVICE (audit du 17/09/2026) : sans limite, une rafale de requêtes (même sous
// les quotas par IP) déclenchait autant d'appels parallèles vers Overpass ou Wikipédia — de quoi faire bannir le
// serveur. Au-delà de `max` appels en cours, attente dans une file bornée (`queue` places, `waitMs` au plus) ; file
// pleine ou attente trop longue : on renonce (erreur « saturated »), la route répond sans données et ne met rien en
// cache.
function makeServiceLimiter(name, max, queue, waitMs){
  let active = 0;
  const waiting = [];
  function release(){
    active--;
    const next = waiting.shift();
    if(next){ clearTimeout(next.timer); active++; next.resolve(); }
  }
  return {
    name: name,
    async run(fn){
      if(active >= max){
        if(waiting.length >= queue) throw new ServiceSaturatedError(name);
        await new Promise(function(resolve, reject){
          const entry = { resolve: resolve };
          entry.timer = setTimeout(function(){
            const i = waiting.indexOf(entry);
            if(i >= 0) waiting.splice(i, 1);
            reject(new ServiceSaturatedError(name));
          }, waitMs);
          waiting.push(entry);
        });
      } else {
        active++;
      }
      try { return await fn(); } finally { release(); }
    }
  };
}
class ServiceSaturatedError extends Error {
  constructor(name){ super(name + ' saturé (trop d\'appels simultanés)'); this.saturated = true; }
}
const LIMIT_OVERPASS = makeServiceLimiter('Overpass', 2, 8, 8000);
const LIMIT_WIKIPEDIA = makeServiceLimiter('Wikipédia', 6, 40, 8000);
const LIMIT_VISORANDO = makeServiceLimiter('Visorando', 2, 8, 6000);
const LIMIT_WIKIDATA = makeServiceLimiter('Wikidata', 2, 10, 6000);
// Échec « transitoire » d'un service (réseau, délai, 429, 5xx, saturation) : jamais mis en cache, contrairement à une
// réponse aboutie mais vide (404, page sans photo).
// 403 et 408 aussi (10e audit du 18/09/2026) : Wikipédia répond 403 quand il bloque une IP ou un agent — ce refus était
// mis en cache 24 h comme « pas d'article », privant tous les visiteurs de photos pour ce lieu.
function isTransientHttpStatus(status){ return status === 429 || status === 403 || status === 408 || status >= 500; }
// Lecture BORNÉE du corps d'une réponse tierce (10e audit du 18/09/2026) : une réponse de 50 Mo était lue en entier
// (jusqu'à 15 s et autant de mémoire). Une vraie réponse fait au plus quelques centaines de Ko (Overpass : ~2 Mo).
const EXTERNAL_BODY_MAX_BYTES = 8 * 1024 * 1024;
async function readBodyText(resp, maxBytes){
  const max = maxBytes || EXTERNAL_BODY_MAX_BYTES;
  const declared = Number(resp.headers.get('content-length'));
  if(declared > max) throw new Error('réponse trop volumineuse (' + declared + ' octets)');
  if(!resp.body) return '';
  const reader = resp.body.getReader(), chunks = [];
  let total = 0;
  for(;;){
    const r = await reader.read();
    if(r.done) break;
    total += r.value.length;
    if(total > max){ try { await reader.cancel(); } catch(e){} throw new Error('réponse trop volumineuse (plus de ' + max + ' octets)'); }
    chunks.push(r.value);
  }
  return Buffer.concat(chunks.map(c => Buffer.from(c.buffer, c.byteOffset, c.length))).toString('utf8');
}
async function readBodyJson(resp, maxBytes){ return JSON.parse(await readBodyText(resp, maxBytes)); }

// Seules des lettres minuscules (2-3, sous-domaines Wikipédia standards, ex. "fr", "es", "pt") —
// filet de sécurité avant d'insérer la valeur dans une URL, jamais un souci en usage normal
// (voir VISITOR_LANG côté client, qui produit déjà une valeur propre).
function sanitizeLangCode(raw){
  const code = String(raw || '').toLowerCase();
  return /^[a-z]{2,3}$/.test(code) ? code : 'fr';
}

// null = pas d'article exploitable (404…) ; exception = échec transitoire (réseau, délai, 429, 5xx, service saturé).
function fetchWikiSummary(title, lang){
  return LIMIT_WIKIPEDIA.run(async function(){
    const resp = await fetch('https://' + sanitizeLangCode(lang) + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title), {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'CapSurLInconnu/1.0 (road trip generator, personal use; https://github.com/lume419/cap-sur-linconnu)',
        'Accept': 'application/json'
      }
    });
    if(isTransientHttpStatus(resp.status)) throw new Error('HTTP ' + resp.status);
    if(!resp.ok) return null;
    return await readBodyJson(resp); // lecture du corps comprise dans le créneau du limiteur
  });
}

// Résout une vraie photo Wikipédia pour une commune, dans la langue du VISITEUR (lang — voir
// VISITOR_LANG côté client), pas celle de la commune ni celle de l'interface. Essaie d'abord
// "Nom (Région)" quand la région est connue (la convention de désambiguïsation de Wikipédia pour
// les lieux homonymes), puis "Nom" seul. Pour la France, "Région" vient de la table DEPARTMENTS
// (code -> nom) ; pour les autres pays, le nom de région est déjà en clair dans les données (voir
// scripts/build-country-communes.js), pas besoin de table de correspondance. Si le résultat est
// une page d'homonymie (plusieurs lieux du même nom, région inconnue), on renvoie "pas de photo"
// plutôt qu'une image potentiellement fausse — mieux vaut aucune image qu'une image du mauvais endroit.
// VÉRIFICATION DES SOURCES (septembre 2026) : une recherche Wikipédia par le seul NOM tombe sur l'homonyme le plus connu
// (« Madonna » -> la chanteuse, « Statue de la Liberté » -> New York, « Monument aux morts » -> Armentières). Un article
// n'est retenu que s'il est GÉOLOCALISÉ à moins de near.km du lieu (coordonnées renvoyées par l'API summary) ; sans
// coordonnées (personne, notion générale) ou sans point de référence, il est écarté : ni photo, ni lien.
const PHOTO_NEAR_KM = { poi: 5, area: 15, stop: 20 };
function wikiPlaceMatches(data, near){
  const c = data && data.coordinates;
  if(!near || !c || !isFinite(c.lat) || !isFinite(c.lon)) return false;
  return haversineKm(near.lat, near.lon, c.lat, c.lon) <= near.km;
}
// Repli pour un nom local absent (ou homonyme) dans la langue du visiteur — « Milano » est un rappeur sur Wikipédia en
// français : même nom sur Wikipédia en anglais (qui redirige vers Milan), position vérifiée, puis article correspondant
// dans la langue du visiteur via Wikidata (même vérification) ; à défaut, l'article anglais vérifié.
async function fetchWikidataSitelink(qid, lang){
  if(!/^Q\d+$/.test(String(qid || ''))) return null;
  return LIMIT_WIKIDATA.run(async function(){
    const resp = await fetch('https://www.wikidata.org/w/api.php?action=wbgetentities&props=sitelinks&format=json&ids=' + qid + '&sitefilter=' + sanitizeLangCode(lang) + 'wiki', {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'CapSurLInconnu/1.0 (road trip generator, personal use; https://github.com/lume419/cap-sur-linconnu)', 'Accept': 'application/json' }
    });
    if(isTransientHttpStatus(resp.status)) throw new Error('HTTP ' + resp.status);
    if(!resp.ok) return null;
    const data = await readBodyJson(resp);
    const link = data && data.entities && data.entities[qid] && data.entities[qid].sitelinks && data.entities[qid].sitelinks[sanitizeLangCode(lang) + 'wiki'];
    return link ? link.title : null;
  });
}
// ctx.failed passe à true au moindre échec transitoire (voir fetchWikiSummary) : /api/photo ne met alors pas en cache
// un « pas de photo » qui ne serait dû qu'à une panne passagère.
// Crédit d'une image Wikimedia (10e audit du 18/09/2026) : auteur et licence, que les mentions légales promettent
// d'afficher avec l'image — l'API « summary » ne les donne pas. Métadonnées du fichier (imageinfo/extmetadata), servies
// par le Wikipédia de la langue pour les fichiers de Commons comme pour les fichiers locaux. Texte seul (le champ Artist
// est du HTML), longueurs bornées ; licence : lien https vers un hôte connu seulement. Échec : crédit absent, jamais
// d'échec de la photo elle-même.
// Texte seul (11e audit du 19/09/2026) : balises retirées sur tout le champ (borné à 20 000 caractères) AVANT toute
// coupe — la coupe à 4 000 caractères laissait des balises tronquées (« <span title="… ») ; entités décodées ensuite,
// puis plus aucun chevron (« &lt;img…&gt; » redevenait du balisage), ni caractère de contrôle ou de sens d'écriture.
function stripHtmlText(html, max){
  let txt = String(html || '').slice(0, 20000).replace(/<[^>]*>?/g, ' ');
  txt = decodeHtmlEntities(txt).replace(/[<>]/g, ' ').replace(/[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  txt = txt.replace(/\s+/g, ' ').trim();
  return txt.length > max ? txt.slice(0, max - 1) + '…' : txt;
}
// URL https vers un hôte de la liste (expression sur le NOM D'HÔTE analysé, jamais sur le début de la chaîne), sinon null.
function safeHttpsUrl(raw, hostRe, maxLen){
  try {
    const u = new URL(String(raw || ''));
    if(u.protocol !== 'https:' || !hostRe.test(u.hostname) || u.href.length > (maxLen || 2000)) return null;
    return u.href;
  } catch(e){ return null; }
}
const WIKI_MEDIA_HOST_RE = /^([a-z0-9-]+\.)*(wikimedia|wikipedia)\.org$/;
const LICENSE_HOST_RE = /^(creativecommons\.org|([a-z0-9-]+\.)*(wikimedia|wikipedia)\.org|www\.gnu\.org)$/;
async function fetchImageCredit(imageUrl, lang){
  // Hôtes des images : upload.wikimedia.org et thumb.wikimedia.org (vignettes de l'API REST de Wikipédia depuis 2026).
  const m = /^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/[a-z-]+\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^\/?#]+)/.exec(String(imageUrl || ''));
  if(!m) return null;
  let file;
  try { file = decodeURIComponent(m[1]); } catch(e){ return null; }
  return LIMIT_WIKIPEDIA.run(async function(){
    const url = 'https://' + sanitizeLangCode(lang) + '.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo' +
      '&iiprop=extmetadata&iiextmetadatafilter=Artist%7CLicenseShortName%7CLicenseUrl&titles=' + encodeURIComponent('File:' + file);
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000), headers: {
      'User-Agent': 'CapSurLInconnu/1.0 (road trip generator, personal use; https://github.com/lume419/cap-sur-linconnu)', 'Accept': 'application/json' } });
    // Échec passager (429, 5xx, 403) : exception, pour que la photo ne soit pas mise en cache sans son crédit (11e audit).
    if(isTransientHttpStatus(resp.status)) throw new Error('HTTP ' + resp.status);
    if(!resp.ok) return null;
    const data = await readBodyJson(resp, 512 * 1024);
    const page = data && data.query && Array.isArray(data.query.pages) ? data.query.pages[0] : null;
    const meta = page && Array.isArray(page.imageinfo) && page.imageinfo[0] && page.imageinfo[0].extmetadata;
    if(!meta) return null;
    const author = meta.Artist ? stripHtmlText(meta.Artist.value, 120) : '';
    const license = meta.LicenseShortName ? stripHtmlText(meta.LicenseShortName.value, 60) : '';
    const licenseUrl = meta.LicenseUrl ? safeHttpsUrl(meta.LicenseUrl.value, LICENSE_HOST_RE, 300) : null;
    return (author || license) ? { author: author || null, license: license || null, licenseUrl: licenseUrl } : null;
  });
}
async function resolvePlacePhoto(name, deptCode, country, lang, near, ctx){
  ctx = ctx || {};
  const first = await resolvePlacePhotoIn(name, deptCode, country, lang, near, null, ctx);
  if(first.image || !near || lang === 'en') return first;
  let en = null;
  try { en = await fetchWikiSummary(name, 'en'); } catch(e){ ctx.failed = true; }
  if(!en || en.type === 'disambiguation' || !wikiPlaceMatches(en, near)) return first;
  let title = null;
  try { title = await fetchWikidataSitelink(en.wikibase_item, lang); } catch(e){ ctx.failed = true; }
  if(title){
    const local = await resolvePlacePhotoIn(title, null, country, lang, near, [title], ctx);
    if(local.image || (local.wikiUrl && !first.wikiUrl)) return local.image ? local : (first.wikiUrl ? first : local);
  }
  if(first.wikiUrl) return first;
  return await resolvePlacePhotoIn(name, null, country, 'en', near, [name], ctx);
}
async function resolvePlacePhotoIn(name, deptCode, country, lang, near, titles, ctx){
  ctx = ctx || {};
  // hasOwnProperty : « constructor » ou « __proto__ » ne doivent pas être pris pour un département.
  const deptName = (!country || country === 'FR')
    ? (deptCode && Object.prototype.hasOwnProperty.call(DEPARTMENTS, deptCode) ? DEPARTMENTS[deptCode] : null)
    : (deptCode || null);
  const attempts = titles ? titles.slice() : [];
  if(!titles){
    if(deptName) attempts.push(name + ' (' + deptName + ')');
    attempts.push(name);
  }

  let bestNoImage = null; // meilleure page trouvée SANS photo, gardée en repli (voir plus bas)
  for(const title of attempts){
    let data;
    try { data = await fetchWikiSummary(title, lang); } catch(e){ ctx.failed = true; console.warn('[photo] échec pour ' + JSON.stringify(title) + ':', e.message); continue; }
    if(!data || data.type === 'disambiguation') continue;
    if(!wikiPlaceMatches(data, near)) continue; // homonyme ailleurs, ou article sans lieu
    const thumbSource = (data.thumbnail && data.thumbnail.source) || null;
    const originalSource = (data.originalimage && data.originalimage.source) || null;
    const wikiUrl = safeHttpsUrl(data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page, WIKI_MEDIA_HOST_RE);
    if(!thumbSource && !originalSource){
      // Une vraie page existe (ce n'est pas une homonymie), juste sans photo dessus — un lien vers
      // elle reste préférable à aucun lien du tout. Gardé de côté au cas où aucune tentative
      // suivante ne ferait mieux (ex. la version désambiguïsée "Nom (Région)" échoue mais "Nom"
      // seul aboutit avec une vraie photo, cette dernière doit primer).
      if(!bestNoImage) bestNoImage = { image: null, imageFull: null, wikiUrl: wikiUrl, title: data.title || title };
      continue;
    }
    // La vignette renvoyée par l'API "summary" ne fait qu'environ 320px de large — nette en petite
    // icône, mais visiblement floue une fois affichée en grand bandeau. On a essayé de demander à
    // Wikimedia une vignette plus large en modifiant la largeur dans l'URL (".../800px-fichier.jpg"),
    // mais leur service refuse ces tailles "à la demande" non déjà mises en cache (protection
    // anti-abus, HTTP 400 "Use thumbnail sizes listed on...") même quand l'image d'origine est bien
    // plus grande. La solution fiable est donc d'utiliser directement l'image d'origine (résolution
    // native), qui elle est toujours disponible — au prix d'un téléchargement un peu plus lourd.
    const image = safeHttpsUrl(originalSource || thumbSource, WIKI_MEDIA_HOST_RE);
    const imageFull = image;
    if(!image) continue; // URL d'image inattendue : ignorée (défense en profondeur, le client la refuserait aussi)
    let credit = null;
    try { credit = await fetchImageCredit(imageFull, lang); } catch(e){ credit = null; ctx.failed = true; }
    return { image: image, imageFull: imageFull, wikiUrl: wikiUrl, title: data.title || title,
      author: credit ? credit.author : null, license: credit ? credit.license : null, licenseUrl: credit ? credit.licenseUrl : null };
  }
  return bestNoImage || { image: null, imageFull: null, wikiUrl: null, title: null };
}

// "Lieux et monuments" depuis Wikipédia, en complément d'Overpass : l'article de la commune a
// souvent une section listant son patrimoine local, parfois illustrée par une galerie de photos —
// y compris pour des lieux qui n'ont pas leur propre article Wikipédia (donc aucune photo possible
// via resolvePlacePhoto), comme une petite église ou chapelle de village. Overpass, lui, ne connaît
// que ce qui est nommé et taggé dans OpenStreetMap : les deux sources se complètent.
function fetchWikiWikitext(title){
  return LIMIT_WIKIPEDIA.run(async function(){
    const resp = await fetch('https://fr.wikipedia.org/w/api.php?action=parse&page=' + encodeURIComponent(title) + '&prop=wikitext&format=json&formatversion=2', {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'CapSurLInconnu/1.0 (road trip generator, personal use; https://github.com/lume419/cap-sur-linconnu)',
        'Accept': 'application/json'
      }
    });
    if(isTransientHttpStatus(resp.status)) throw new Error('HTTP ' + resp.status);
    if(!resp.ok) return null;
    const data = await readBodyJson(resp);
    if(data.error || !data.parse) return null;
    return data.parse.wikitext || null;
  });
}

// Repère la section "Lieux et monuments" (ou proche : "Patrimoine", "Monuments") quel que soit son
// niveau de titre (== ou ===, ça varie d'un article à l'autre), extrait sa liste à puces et sa
// galerie d'images éventuelle.
// Résout {{s-|XIX}} (modèle "siècle" le plus utilisé sur Wikipédia francophone, retrouvé tel quel
// dans le wikitexte source de Modèle:s-) en texte lisible AVANT le retrait générique des modèles
// juste en dessous — sans ça, "Le lavoir construit au début du {{s-|XIX}} aux abords de la
// fontaine Sainte-Bénigne" perdait le siècle en même temps que la syntaxe brute, laissant une
// phrase qui ne veut plus rien dire ("le lavoir construit au début du aux abords de..."), signalé
// par l'utilisateur. Logique exactement recopiée du wikitexte du modèle lui-même : le chiffre
// romain donné en paramètre est repris tel quel, suivi de "er siècle" si ce paramètre vaut
// "I"/"i"/"1" (exception française "premier"), sinon de "e siècle" (le "e" en exposant du rendu
// HTML — <sup>ᵉ</sup> — redevient un simple "e" en texte brut, pas de perte d'information ici).
// Un éventuel second paramètre ({{s-|XIX|e}}, jamais vu en pratique mais présent dans la syntaxe du
// modèle) n'affecte pas le texte affiché (il alimente seulement une catégorie de maintenance) :
// ignoré sans risque.
function resolveCenturyTemplate(s){
  s = s.replace(/\{\{\s*([IVXLC]+)(e|er)\s+siècle\s*\}\}/g, '$1$2 siècle');
  return s.replace(/\{\{s-\s*\|\s*([IVXLCDMivxlcdm]+|1)\s*(?:\|[^{}]*)?\}\}/g, function(_, num){
    var suffix = (num === 'I' || num === 'i' || num === '1') ? 'er' : 'e';
    return num + suffix + ' siècle';
  });
}

// Retire le "bruit" restant propre au wikitexte brut (modèles {{...}} non résolus ci-dessus,
// balises <ref>...) avant d'extraire un nom de lieu — repéré sur un cas réel (Épagny, Côte-d'Or) :
// la puce "Le lavoir construit au début du {{s-|XIX}} aux abords de la fontaine Sainte-Bénigne."
// n'a AUCUN wikilien ([[...]]), donc tombe dans le repli `line.split(/[,.;(]/)[0]` (voir plus bas)
// — et comme cette phrase ne contient aucune virgule/point-virgule/parenthèse avant son point
// final, elle est reprise QUASIMENT en entier comme "nom", tout modèle wikitexte non résolu compris,
// brut, directement affiché à l'utilisateur. Modèles retirés par comptage d'accolades équilibrées
// (au lieu d'une regex non gourmande simple) : certains modèles wikitexte s'imbriquent (ex. une
// date dans un modèle de référence), une regex plate laisserait des accolades orphelines dans ce cas.
function stripWikiNoise(line){
  let s = resolveCenturyTemplate(line).replace(/<ref\b[^>]*\/>/gi, '').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '');
  let out = '', i = 0;
  while(i < s.length){
    if(s[i] === '{' && s[i+1] === '{'){
      let depth = 1, j = i + 2;
      while(j < s.length && depth > 0){
        if(s[j] === '{' && s[j+1] === '{'){ depth++; j += 2; }
        else if(s[j] === '}' && s[j+1] === '}'){ depth--; j += 2; }
        else j++;
      }
      i = j;
    } else {
      out += s[i];
      i++;
    }
  }
  return out.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim();
}

// Nom d'un lieu à partir d'une puce de la section (septembre 2026). Avant : cible du PREMIER lien de la ligne, ou tout le
// début de ligne — d'où des « lieux » comme « Église (édifice) » (article générique lié sur le mot « église »), « Sur
// l'ensemble de la commune », « Arbres remarquables » ou « Plus beaux villages de France ». Désormais : texte AFFICHÉ
// des liens, coupé avant la première précision (ponctuation, « édifiée en… »), retenu seulement s'il désigne un lieu
// (MONUMENT_PLACE_WORDS) sans formulation générique ou plurielle.
const MONUMENT_PLACE_WORDS = /(?:^|[\s'’-])(églises?|chapelles?|château|châteaux|manoir|musée|abbaye|prieuré|couvent|cathédrale|basilique|collégiale|oratoire|calvaire|croix|monument|statue|stèle|mémorial|tour|donjon|pont|fontaine|lavoir|moulin|four|halle|maison|hôtel|palais|porte|remparts?|fort|forteresse|citadelle|casteddu|castellu|dolmen|menhir|oppidum|site archéologique|grotte|jardin|parc|arboretum|lac|cascade|phare|viaduc|aqueduc|arènes|théâtre|temple|synagogue|mosquée|cimetière|ossuaire|ruines|vestiges|domaine|bastide|villa|belvédère|sanctuaire|ermitage|commanderie|pigeonnier|forge|gare|mairie|presbytère|beffroi|clocher|puits|borie|bories|cabane|cromlech)(?=$|[\s'’,-])/i;
const MONUMENT_GENERIC_START = /^(?:sites?\s|arbres?\s|plusieurs\s|nombreu(?:x|ses)\s|sur\s|l['’]une? des|le plus|la plus|les plus|ensemble|divers|autres?\s|quelques|patrimoine)/i;
function monumentName(line){
  const text = String(line || '')
    .replace(/^[*#:;\s]+/, '')                   // puces imbriquées (« ** »)
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1') // [[cible|texte]] -> texte affiché
    .replace(/\[\[([^\]]+)\]\]/g, '$1')          // [[cible]] -> cible
    .replace(/'{2,}/g, '').trim();
  let name = text.split(/\s*[,.;:(]\s|\s*[,.;:(]$|\s[–—-]\s/)[0];
  // Précision ou phrase qui suit le nom : participe (« édifiée en… »), relative, ou verbe (« … se dresse sur la place »).
  name = name.split(/\s(?:édifiée?s?|construite?s?|reconstruite?s?|datée?s?|bâtie?s?|inscrite?s?|classée?s?|érigée?s?|restaurée?s?|située?s?|où|qui|dont|depuis|se|s['’]|est|sont|fut|furent|a|ont|domine|dominent|abrite|abritent|surplombe|possède|conserve|remonte|date|attestée?s?|mentionnée?s?|remaniée?s?|agrandie?s?|transformée?s?|dès|puis|avec|au|dans|sur les|sur la|sur le|au cœur|de style|(?:du|de|en)\s+\d)(?=\s|$)/i)[0].trim();
  // Mots orphelins en fin de nom, retirés un par un (une regex à groupe répété était quadratique sur une longue ligne).
  for(let prev = null; prev !== name;){ prev = name; name = name.replace(/\s+(?:de|du|des|d['’]|à|au|aux|en|et|sur|haut|haute|long|longue)\s*$/i, '').trim(); }
  name = name.replace(/^(?:les\s+)?vestiges\s+(?:du|de la|de l['’]|des)\s*/i, '').trim(); // "Vestiges du château de X" -> le lieu
  name = name.replace(/^(?:le|la|les)\s+(?=\S)/i, '').replace(/^l['’](?=\S)/i, '').trim(); // article initial d'une phrase
  if(!name || name.length < 4 || name.length > 80 || name.split(/\s+/).length > 9) return null;
  if(/[()]/.test(name)) return null; // reste d'un titre d'article générique « … (édifice) »
  if(!MONUMENT_PLACE_WORDS.test(name) || MONUMENT_GENERIC_START.test(name)) return null;
  if(name === name.toUpperCase() && /\p{Lu}{3}/u.test(name)){ // TOUT EN CAPITALES -> casse ordinaire, particules en minuscules
    name = name.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
      .replace(/(\s)(De|Du|Des|Di|Da|Dei|U|A|E|La|Le|Les|L|D)(?=[\s'’])/g, (m, a, b) => a + b.toLowerCase());
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}
// Bornes d'analyse (2e audit du 17/09/2026) : certaines expressions de monumentName et stripWikiNoise ont un coût
// quadratique sur une longue ligne (60 Ko d'une puce piégée : 5 s de blocage). Une vraie section « Lieux et monuments »
// fait quelques Ko, une puce utile quelques dizaines de caractères.
const WIKITEXT_MAX_CHARS = 600000, MONUMENT_SECTION_MAX_CHARS = 40000, MONUMENT_LINE_MAX_CHARS = 400;
function extractMonumentsSection(wikitext){
  wikitext = String(wikitext || '').slice(0, WIKITEXT_MAX_CHARS);
  const m = wikitext.match(/={2,4}\s*(?:Lieux et monuments|Patrimoine(?: architectural)?|Monuments(?: et lieux)?)\s*={2,4}\n([\s\S]*?)(?=\n={2,4}[^=]|$)/i);
  if(!m) return null;
  const section = m[1].slice(0, MONUMENT_SECTION_MAX_CHARS);

  const gallery = [];
  // Recherche linéaire (10e audit du 18/09/2026) : la regex /<gallery[^>]*>([\s\S]*?)<\/gallery>/ reprenait toute la
  // section à chaque « <gallery » non fermée — coût quadratique (441 ms pour un article piégé de 40 Ko).
  const lowerSection = section.toLowerCase();
  const gStart = lowerSection.indexOf('<gallery'), gOpenEnd = gStart >= 0 ? section.indexOf('>', gStart) : -1;
  const gEnd = gOpenEnd >= 0 ? lowerSection.indexOf('</gallery>', gOpenEnd) : -1;
  const galleryBlock = gEnd >= 0 ? [null, section.slice(gOpenEnd + 1, gEnd)] : null;
  if(galleryBlock){
    for(const line of galleryBlock[1].split('\n')){
      const fm = line.match(/^\s*Fichier:([^|]+\.(?:jpe?g|png|gif))/i);
      if(!fm) continue;
      const captionMatch = line.match(/<center>(.*?)<\/center>/i);
      const caption = (captionMatch ? captionMatch[1] : line).replace(/<[^>]+>/g, '').replace(/\[\[[^\]|]*\|?/g, '').replace(/\]\]/g, '').trim();
      gallery.push({ file: fm[1].trim(), caption });
    }
  }

  const items = [];
  const bulletRe = /^\*\s*(.+)$/gm;
  let bm;
  while((bm = bulletRe.exec(section))){
    if(/^<gallery/i.test(bm[1]) || bm[1].length > MONUMENT_LINE_MAX_CHARS) continue;
    const name = monumentName(stripWikiNoise(bm[1]));
    if(name) items.push(name);
  }
  return { items, gallery };
}

// Le wikitexte ne tague pas le "type" du lieu comme le fait OpenStreetMap — simple déduction par
// mot-clé dans le nom, suffisante pour choisir une icône/étiquette cohérente avec le reste de l'app.
function inferMonumentType(name){
  const n = name.toLowerCase();
  if(/ch[aâ]teau/.test(n)) return 'castle';
  if(/manoir/.test(n)) return 'manor';
  if(/(^|[\s'’-])[eé]glise(s)?($|[\s'’,-])/.test(n)) return 'place_of_worship'; // \b ne reconnaît pas « é »
  if(/chapelle/.test(n)) return 'chapel';
  if(/mus[ée]e/.test(n)) return 'museum';
  if(/dolmen|menhir|site (arch[ée]ologique|gallo-romain)/.test(n)) return 'archaeological_site';
  if(/fort(eresse)?|citadelle/.test(n)) return 'fort';
  if(/ruines?/.test(n)) return 'ruins';
  return 'monument';
}

// Associe les lieux de la liste aux images de la galerie — évite un aller-retour Wikipédia
// supplémentaire quand la photo est déjà là, dans l'article de la commune (le seul moyen d'avoir
// une image pour un lieu sans article dédié).
//
// Deux pièges rencontrés en testant sur un cas réel (Saint-Pierre-de-Frugie) :
// 1) Le nom de la commune elle-même apparaît dans presque toutes les légendes (ce sont ses photos)
//    — un mot comme "Pierre" tiré de "Église Saint-Pierre-et-Saint-Paul" matchait alors n'importe
//    quelle légende mentionnant "Saint-Pierre-de-Frugie", pas l'église. `excludeWords` (les mots du
//    nom de la commune) neutralise ça.
// 2) Deux lieux différents peuvent ne partager qu'un seul mot distinctif (ex. "Château de
//    Montcigoux" et "Chapelle de Montcigoux" — seul "Montcigoux" les distingue du reste) : associer
//    lieu par lieu dans l'ordre de la liste faisait "gagner" le premier traité même quand l'autre
//    correspondait mieux. On calcule donc un score pour CHAQUE paire (lieu, image), et on assigne
//    dans l'ordre décroissant de score (un lieu et une image ne servent qu'une fois) plutôt que
//    lieu par lieu.
const MONUMENT_STOPWORDS = new Set(['château','chateau','manoir','église','eglise','chapelle','vestiges','ancien','ancienne','saint','sainte','du','de','des','la','le','les','et']);
const MONUMENT_TYPE_WORDS = ['château','chateau','manoir','église','eglise','chapelle','musée','musee','fort','citadelle'];
function communeNameWords(name){
  return new Set(
    String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/[\s'-]+/).filter(w => w.length > 2)
  );
}
function matchGalleryImages(items, gallery, excludeWords){
  const pairs = [];
  items.forEach((name, idx) => {
    const lower = name.toLowerCase();
    const typeWord = MONUMENT_TYPE_WORDS.find(t => lower.indexOf(t) >= 0) || null;
    const words = lower.split(/[\s'-]+/).filter(w => w.length > 3 && !MONUMENT_STOPWORDS.has(w) && !excludeWords.has(w));
    if(!words.length) return;
    gallery.forEach((g, gIdx) => {
      const cap = g.caption.toLowerCase();
      const wordScore = words.filter(w => cap.indexOf(w) >= 0).length;
      if(wordScore === 0) return;
      const typeBonus = (typeWord && cap.indexOf(typeWord) >= 0) ? 1 : 0;
      pairs.push({ idx, gIdx, score: wordScore * 2 + typeBonus });
    });
  });
  pairs.sort((a, b) => b.score - a.score);
  const usedItems = new Set(), usedFiles = new Set();
  const result = new Map(); // idx -> nom de fichier
  for(const p of pairs){
    if(usedItems.has(p.idx) || usedFiles.has(p.gIdx)) continue;
    usedItems.add(p.idx); usedFiles.add(p.gIdx);
    result.set(p.idx, gallery[p.gIdx].file);
  }
  return result;
}
function commonsFileUrl(filename){
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(filename);
}

// Même logique d'essais que resolvePlacePhoto : "Nom (Département)" d'abord si connu (convention
// de désambiguïsation Wikipédia), puis "Nom" seul.
// ctx.failed : échec transitoire (voir fetchWikiSummary), le résultat de /api/pois n'est alors pas mis en cache.
async function fetchCommuneMonuments(name, deptCode, lat, lon, ctx){
  ctx = ctx || {};
  const deptName = deptCode && Object.prototype.hasOwnProperty.call(DEPARTMENTS, deptCode) ? DEPARTMENTS[deptCode] : null;
  const attempts = [];
  if(deptName) attempts.push(name + ' (' + deptName + ')');
  attempts.push(name);
  for(const title of attempts){
    // Titre d'un autre espace de noms (« Utilisateur:X/brouillon », « Discussion:… ») : jamais un article de commune, et
    // modifiable par n'importe qui — refusé avant tout appel.
    if(title.includes(':')) continue;
    // Article d'un homonyme (autre commune du même nom, notion générale) : écarté, voir wikiPlaceMatches. Contrôlé AVANT
    // de télécharger le wikitexte (2e audit du 17/09/2026) : seul l'article géolocalisé près de l'étape est analysé.
    let summary = null;
    try { summary = await fetchWikiSummary(title, 'fr'); } catch(e){ ctx.failed = true; continue; }
    if(!wikiPlaceMatches(summary, { lat, lon, km: PHOTO_NEAR_KM.stop })) continue;
    let wikitext;
    try { wikitext = await fetchWikiWikitext(title); } catch(e){ ctx.failed = true; continue; }
    if(!wikitext) continue;
    const extracted = extractMonumentsSection(wikitext);
    if(extracted && extracted.items.length){
      // Ces lieux (église, mur d'une abbaye disparue...) n'ont en général pas leur propre article —
      // seule la page de LA COMMUNE en parle, dans cette section. Un lien vers elle reste plus utile
      // qu'aucun lien du tout.
      extracted.pageUrl = 'https://fr.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_'));
      return extracted;
    }
  }
  return null;
}

function normalizePoiName(s){
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Combine les deux sources : Wikipédia d'abord (généralement plus fiable — sourcé, souvent déjà
// illustré), puis Overpass pour compléter/diversifier, dédoublonné par nom normalisé. La section
// "Lieux et monuments" (fetchCommuneMonuments) repose sur des conventions propres à Wikipédia EN
// FRANÇAIS (titres de section, vocabulaire des types de lieux — voir extractMonumentsSection et
// MONUMENT_TYPE_WORDS) : pas encore adaptée aux autres langues, donc volontairement pas tentée
// hors de France (country) — Overpass, lui, fonctionne déjà partout sans changement.
async function fetchAllRealPOIs(lat, lon, name, deptCode, country){
  const tryMonuments = name && (!country || country === 'FR');
  const wikiCtx = {};
  const [overpassResult, wikiResult] = await Promise.all([
    fetchRealPOIs(lat, lon).catch(() => null),
    tryMonuments ? fetchCommuneMonuments(name, deptCode, lat, lon, wikiCtx).catch(() => { wikiCtx.failed = true; return null; }) : Promise.resolve(null)
  ]);
  const seen = new Set();
  const combined = [];
  if(wikiResult){
    const imageByIdx = matchGalleryImages(wikiResult.items, wikiResult.gallery, communeNameWords(name));
    wikiResult.items.forEach((itemName, idx) => {
      const key = normalizePoiName(itemName);
      if(seen.has(key)) return;
      seen.add(key);
      const file = imageByIdx.get(idx);
      const entry = { name: itemName, type: inferMonumentType(itemName), wikiUrl: wikiResult.pageUrl || null };
      if(file){ entry.image = commonsFileUrl(file); entry.imageFull = entry.image; }
      combined.push(entry);
    });
  }
  if(overpassResult){
    for(const p of overpassResult){
      const key = normalizePoiName(p.name);
      if(seen.has(key)) continue;
      seen.add(key);
      combined.push(p);
    }
  }
  // null seulement si on n'a rien ET qu'Overpass (la source la moins fiable) a explicitement
  // échoué — voir /api/pois pour pourquoi cette distinction compte pour la mise en cache.
  if(combined.length === 0 && overpassResult === null) return null;
  const out = shuffleArr(combined).slice(0, 12);
  // Résultat incomplet (Overpass ou Wikipédia en échec passager) : servi, mais pas mis en cache (voir /api/pois).
  out.partial = overpassResult === null || !!wikiCtx.failed;
  return out;
}

// Points d'intérêt réels en direct (OpenStreetMap / Overpass), pour les communes hors de
// featured.txt (~300 communes seulement sur 35 000 — voir les commits précédents sur le biais
// géographique que ça causait). Plutôt que d'inventer des activités, on interroge Overpass au
// moment du tirage pour la commune réellement choisie, avec les mêmes catégories que celles ayant
// servi à constituer featured.txt à l'origine.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const POI_RADIUS_M = 8000; // ~8 km autour du centre de la commune — à portée d'une sortie sur place
const poiCache = new Map();
const POI_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14j : ces lieux ne changent presque jamais

// `amenity=place_of_worship` retiré volontairement : dans une ville dense (testé sur Lyon), cette
// seule catégorie fait à elle seule dépasser le budget temps interne d'Overpass (`[timeout:20]`,
// qui répond alors HTTP 200 mais avec un simple `"remark": "runtime error: Query timed out..."`
// dans le corps — un "succès" muet, jamais détecté comme une erreur, qui se traduisait par 0
// résultat pour absolument toutes les grandes villes). Vérifié : la même requête sans cette
// catégorie passe de "timeout après 21s" à "10,7s, dizaines de résultats" pour Lyon. Une église de
// quartier n'est de toute façon pas la curiosité la plus différenciante (déjà couverte, en creux,
// par la suggestion générique "Visite de l'église ou du patrimoine bâti local").
function buildOverpassQuery(lat, lon){
  const around = `around:${POI_RADIUS_M},${lat},${lon}`;
  // Zone d'abord (tous les éléments nommés du rayon, une seule fois), puis filtrage par type sur ce jeu : mêmes
  // résultats (vérifié à l'identique, 829 éléments autour de Lyon) mais 2,5 à 5 fois plus rapide sur
  // overpass.openstreetmap.fr (septembre 2026 : 1,8 s au lieu de 9 s en zone rurale, 3,9 s au lieu de 10 s à Lyon) —
  // six recherches géographiques séparées coûtaient bien plus cher qu'une seule.
  return `[out:json][timeout:24];
  nwr["name"](${around})->.a;
  (
    node.a["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|theme_park|artwork)$"];
    way.a["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|theme_park|artwork)$"];
    node.a["historic"~"^(monument|memorial|archaeological_site|castle|ruins|fort|citadel|manor|chapel)$"];
    way.a["historic"~"^(monument|memorial|archaeological_site|castle|ruins|fort|citadel|manor|chapel)$"];
    nwr.a["natural"~"^(peak|waterfall|beach|cave_entrance)$"];
    nwr.a["leisure"="nature_reserve"];
  );out center 80;`;
}

// Le type interne (utilisé par POI_TYPE_LABEL côté client) est directement l'une des valeurs de
// tag ciblées par la requête ci-dessus — pas besoin d'une table de correspondance séparée.
function poiTypeFromTags(tags){
  if(tags.tourism) return tags.tourism;
  if(tags.historic) return tags.historic;
  if(tags.natural) return tags.natural;
  if(tags.leisure === 'nature_reserve') return 'nature_reserve';
  return null;
}

// Filet de sécurité complémentaire : Overpass peut répondre HTTP 200 tout en ayant abandonné la
// requête en cours de route (voir plus haut) — ce cas se signale par un champ "remark" au lieu
// d'une vraie erreur HTTP. Sans ce contrôle, une telle réponse partielle serait mise en cache comme
// un "0 résultat" légitime pendant 14 jours.
function isPartialOverpassResponse(data){
  return !!(data && typeof data.remark === 'string' && /timed out|runtime error/i.test(data.remark));
}

function shuffleArr(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Les instances publiques Overpass sont parfois lentes ou en limite de charge (504, timeout...) —
// plusieurs miroirs en repli évitent qu'une indisponibilité passagère prive tout le monde de
// l'enrichissement le temps que ça se rétablisse. Reste silencieux dans tous les cas : c'est un
// "bonus" (vraies activités), jamais un blocage du tirage lui-même.
// overpass.openstreetmap.fr en premier : hébergé en France (comme ce serveur), constaté plus
// rapide et plus fiable que les deux autres lors des tests (13s contre 20-25s, voire échec).
const OVERPASS_MIRRORS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

async function queryOverpass(url, query, timeoutMs){
  const controller = new AbortController();
  // Les instances publiques Overpass répondent parfois en 20s passées sous charge (constaté en
  // test réel) — sans gravité ici puisque cet enrichissement arrive en tâche de fond après
  // l'affichage initial du trajet (voir app.js), jamais avant.
  const timer = setTimeout(() => controller.abort(), timeoutMs || 25000);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'CapSurLInconnu/1.0 (road trip generator, personal use; https://github.com/lume419/cap-sur-linconnu)'
      },
      body: query,
      signal: controller.signal
    });
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await readBodyJson(resp);
    if(isPartialOverpassResponse(data)) throw new Error('réponse partielle (' + data.remark + ')');
    return data;
  } finally {
    clearTimeout(timer);
  }
}
// Miroirs essayés l'un après l'autre dans un délai TOTAL de OVERPASS_TOTAL_MS (audit du 17/09/2026 : 25 s PAR miroir,
// soit jusqu'à 75 s pour une seule requête), attente éventuelle du limiteur comprise. Un seul créneau du limiteur pour
// toute la série : c'est un seul appel logique. null = tous en échec (jamais mis en cache par les appelants).
const OVERPASS_TOTAL_MS = 25000;
async function queryOverpassMirrors(query, label){
  const deadline = Date.now() + OVERPASS_TOTAL_MS;
  try {
    return await LIMIT_OVERPASS.run(async function(){
      for(const url of OVERPASS_MIRRORS){
        const remaining = deadline - Date.now();
        if(remaining < 1000) break;
        try { return await queryOverpass(url, query, remaining); }
        catch(e){ console.warn('[overpass] miroir ' + url + ' en échec (' + label + '):', e.message); }
      }
      return null;
    });
  } catch(e){
    console.warn('[overpass] ' + e.message + ' (' + label + ')');
    return null;
  }
}

// Renvoie `null` (pas `[]`) si les DEUX miroirs ont échoué (timeout, 5xx...) — distinct d'une
// requête qui a bien abouti mais n'a simplement rien trouvé à proximité. La différence compte
// pour la mise en cache côté appelant : mettre en cache un échec comme un "rien trouvé" aurait
// figé un faux négatif pendant 14 jours à la moindre lenteur passagère d'Overpass (ce qui est
// arrivé en pratique : une commune re-testée avec Overpass de nouveau disponible restait bloquée
// sur un résultat vide mis en cache lors d'un essai précédent en échec).
function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
// Rayon max toléré pour un résultat, un peu plus large que POI_RADIUS_M pour absorber les petits
// écarts de projection — sans quoi le garde-fou ci-dessous deviendrait lui-même trop agressif.
const POI_MAX_DISTANCE_KM = (POI_RADIUS_M / 1000) * 1.25;

async function fetchRealPOIs(lat, lon){
  const query = buildOverpassQuery(lat, lon);
  const data = await queryOverpassMirrors(query, 'pois ' + lat + ',' + lon);
  if(!data) return null;
  const seen = new Set();
  const pois = [];
  for(const el of (data.elements || [])){
    const name = el.tags && el.tags.name;
    const type = el.tags && poiTypeFromTags(el.tags);
    if(!name || !type || seen.has(name)) continue;
    // Le filtre "around" d'Overpass garantit que la GÉOMÉTRIE d'une way/relation croise le rayon
    // demandé, pas que son CENTRE calculé (out center) y reste — une grande zone (ex. une réserve
    // naturelle de plusieurs km²) peut avoir un centre à des dizaines de km du point réellement
    // concerné, alors qu'un simple bord touche le rayon. D'où des activités proposées bien plus
    // loin que prévu (signalé : "à plus d'une heure de route"). On revérifie donc la vraie distance
    // et on écarte ce qui dépasse nettement le rayon demandé plutôt que de faire confiance au filtre
    // Overpass seul.
    const elLat = el.lat != null ? el.lat : (el.center && el.center.lat);
    const elLon = el.lon != null ? el.lon : (el.center && el.center.lon);
    if(elLat == null || elLon == null) continue;
    if(haversineKm(lat, lon, elLat, elLon) > POI_MAX_DISTANCE_KM) continue;
    seen.add(name);
    const poi = { name, type, lat: Math.round(elLat * 1e5) / 1e5, lon: Math.round(elLon * 1e5) / 1e5 };
    // OpenStreetMap indique parfois directement LA bonne photo pour CE lieu précis (tag
    // wikimedia_commons) — bien plus fiable qu'une recherche Wikipédia par le seul nom, qui peut
    // tomber sur un homonyme bien plus connu. Cas réel rencontré : une petite réplique de la
    // "Statue de la Liberté" existe dans plusieurs villages français (ex. Roybon, Isère) — cherchée
    // par ce seul nom sur Wikipédia, on retombe sur l'article de LA statue new-yorkaise, pas la
    // réplique locale. Priorité systématique à cette référence OSM quand elle existe. wikiUrl
    // pointe ici vers la page de description du fichier sur Commons (métadonnées/licence), pas
    // vers l'image brute (déjà utilisée pour `image`).
    const commonsTag = el.tags.wikimedia_commons;
    if(commonsTag){
      const filename = String(commonsTag).replace(/^(file|fichier):/i, '');
      const url = commonsFileUrl(filename);
      poi.image = url;
      poi.imageFull = url;
      poi.wikiUrl = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(filename);
    }
    // Repli : le tag "wikipedia" (format "langue:Titre") pointe vers un vrai article Wikipédia
    // dédié quand il existe, même sans photo Commons associée — un lien reste préférable à aucun
    // lien du tout pour un lieu sans image trouvée.
    if(!poi.wikiUrl && el.tags.wikipedia){
      const wpMatch = String(el.tags.wikipedia).match(/^([a-z-]{2,})\s*:\s*(.+)$/i);
      if(wpMatch) poi.wikiUrl = 'https://' + wpMatch[1].toLowerCase() + '.wikipedia.org/wiki/' + encodeURIComponent(wpMatch[2].trim().replace(/ /g, '_'));
    }
    pois.push(poi);
  }
  // Mélangé côté serveur : Overpass renvoie sensiblement toujours le même ordre de découverte pour
  // un même point — sans ça, les 2 premiers lieux affichés seraient quasi figés à chaque tirage.
  return shuffleArr(pois).slice(0, 10);
}

// Vraies randonnées balisées via Visorando (visorando.com), pour la suggestion "balade" quand elle
// tombe sur la formule générique par défaut — un vrai itinéraire préparé (avec trace GPS, distance,
// dénivelé) vaut bien mieux qu'une phrase générique. On ne récupère QUE le nom et le lien de chaque
// rando (des faits, pas le travail créatif de Visorando : ni la trace GPX, ni la description, ni les
// photos) — l'app renvoie directement vers leur site pour la suite, jamais de contenu recopié ni
// republié. robots.txt de visorando.com autorise ces pages (seul /index.php?component=webservices,
// leur API interne, est explicitement exclu — non utilisée ici).
const VISORANDO_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14j : ces listes changent peu
const visorandoCache = new Map();
const VISORANDO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 CapSurLInconnu/1.0 (+https://github.com/lume419/cap-sur-linconnu)';

function visorandoSlug(name){
  return String(name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const HTML_NAMED_ENTITIES = { amp:'&', quot:'"', lt:'<', gt:'>', nbsp:' ', thinsp:' ', apos:"'",
  eacute:'é', egrave:'è', ecirc:'ê', euml:'ë', agrave:'à', acirc:'â', ccedil:'ç',
  ocirc:'ô', ouml:'ö', ucirc:'û', ugrave:'ù', uuml:'ü', icirc:'î', iuml:'ï',
  Eacute:'É', Egrave:'È', Agrave:'À', Ccedil:'Ç', OElig:'Œ', oelig:'œ' };
function decodeHtmlEntities(s){
  return String(s || '')
    // Code hors Unicode laissé tel quel (« &#99999999; » levait une exception), entités hexadécimales comprises, et nom
    // d'entité cherché dans la table elle-même seulement (« &constructor; » renvoyait une fonction) — 10e audit.
    .replace(/&#(\d{1,7});/g, (m, n) => (+n > 0 && +n <= 0x10FFFF) ? String.fromCodePoint(+n) : m)
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (m, h) => { const n = parseInt(h, 16); return (n > 0 && n <= 0x10FFFF) ? String.fromCodePoint(n) : m; })
    .replace(/&([a-zA-Z]+);/g, (m, name) => Object.prototype.hasOwnProperty.call(HTML_NAMED_ENTITIES, name) ? HTML_NAMED_ENTITIES[name] : m);
}

async function fetchVisorandoHikes(communeName){
  const slug = visorandoSlug(communeName);
  if(!slug) return [];
  const html = await LIMIT_VISORANDO.run(async function(){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch('https://www.visorando.com/randonnee-' + slug + '.html', {
        headers: { 'User-Agent': VISORANDO_UA },
        signal: controller.signal
      });
      if(resp.status === 404) return null; // pas de page pour cette commune : aucune rando à proximité
      if(!resp.ok) throw new Error('HTTP ' + resp.status);
      return await readBodyText(resp); // lecture du corps comprise dans le délai
    } finally {
      clearTimeout(timer);
    }
  });
  if(html === null) return [];
  // Page qui n'est pas une page de lieu Visorando (défi anti-robot, page d'erreur servie en 200) : échec transitoire
  // (10e audit du 18/09/2026) — elle était mise en cache 14 jours comme « aucune randonnée ». Une vraie page de lieu
  // porte ses coordonnées en balises meta (voir plus bas).
  if(!/itude" content="-?\d/.test(html)) throw new Error('page Visorando inattendue');
  const hikes = [];
  const seen = new Set();
  // Un bloc par rando listée ; on ne cherche le nom/lien/distance/durée/difficulté que DANS ce
  // bloc, pour ne jamais associer les infos d'une rando à une autre.
  const blocks = html.split('vr-card vr-card--rando').slice(1);
  for(const block of blocks){
    const linkMatch = block.match(/<a class="card--link" title="([^"]+)" href="(https:\/\/www\.visorando\.com\/randonnee-[a-z0-9-]+\/)"/);
    if(!linkMatch) continue;
    const url = linkMatch[2];
    if(seen.has(url)) continue;
    seen.add(url);
    const distMatch = block.match(/title="Distance"[^>]*\/><span>([^<]+)<\/span>/);
    const durMatch = block.match(/title="Durée"[^>]*\/><span>([^<]+)<\/span>/);
    const diffMatch = block.match(/title="(Facile|Moyenne|Difficile|Très difficile)"/);
    hikes.push({
      name: decodeHtmlEntities(linkMatch[1]),
      url,
      distance: distMatch ? decodeHtmlEntities(distMatch[1]).trim() : null,
      duration: durMatch ? decodeHtmlEntities(durMatch[1]).trim() : null,
      difficulty: diffMatch ? diffMatch[1] : null
    });
  }
  // Lieu de la page (balises meta latitude/longitude) : la page « randonnee-<nom> » peut être celle d'un HOMONYME
  // (« brugge » = Brügge dans le Schleswig-Holstein, pas Bruges) — voir le contrôle de distance dans /api/hike.
  const latMeta = html.match(/itude" content="(-?\d+(?:\.\d+)?)"/g) || [];
  if(latMeta.length >= 2){
    const vals = latMeta.slice(0, 2).map(s => parseFloat(s.match(/"(-?[\d.]+)"$/)[1]));
    hikes.center = { lat: vals[0], lon: vals[1] };
  }
  return hikes;
}

// Renvoie plusieurs randos (pas une seule choisie au hasard) : quand une commune a plusieurs nuits
// d'affilée, chaque jour a besoin d'une suggestion différente (voir buildActivityOptions côté
// client, qui pioche dans cette liste sans jamais reproposer la même rando deux fois pour le même
// séjour). `null` = échec réseau, pas mis en cache (on retentera) ; `{hikes:[]}` en cache = vraiment
// aucune rando trouvée pour cette commune. Plafonné à 8 : largement plus que le nombre de nuits
// possibles au même endroit dans un même voyage.
async function fetchVisorandoHikeList(communeName){
  // Clé = slug (celui de l'URL réellement appelée) : « Saint-Émilion », « saint emilion »… partagent la même entrée.
  const cacheKey = visorandoSlug(communeName);
  if(!cacheKey) return [];
  const cached = visorandoCache.get(cacheKey);
  if(cached && (Date.now() - cached.ts) < VISORANDO_CACHE_TTL_MS){
    const list = cached.hikes.slice(0, 8);
    list.center = cached.hikes.center || null;
    return list;
  }
  let hikes;
  try {
    hikes = await fetchVisorandoHikes(communeName);
  } catch(err){
    console.warn('[hike] échec pour ' + JSON.stringify(communeName) + ':', err.message);
    return null;
  }
  cacheSet(visorandoCache, cacheKey, { hikes, ts: Date.now() });
  const list = hikes.slice(0, 8);
  list.center = hikes.center || null;
  return list;
}

// ---------------------------------------------------------------------------------------------
// RANDONNÉES HORS DE VISORANDO : itinéraires balisés OpenStreetMap (septembre 2026)
// ---------------------------------------------------------------------------------------------
// Visorando ne couvre réellement que quelques pays (HIKING_DATA.visorandoCountries) : ailleurs, et quand Visorando ne
// renvoie rien, on cherche les itinéraires de randonnée balisés d'OpenStreetMap (relations route=hiking nommées) à moins
// de OSM_HIKE_RADIUS_M de l'étape. Seuls le nom, la distance et l'identifiant sont repris (données ODbL, attribution
// « OpenStreetMap ») ; le lien ouvre l'itinéraire sur Waymarked Trails. Une journée = une randonnée : les grands
// itinéraires de plusieurs jours (distance > OSM_HIKE_MAX_KM, réseaux européens/nationaux sans distance connue) sont
// écartés, les réseaux locaux puis régionaux passent en premier.
const OSM_HIKE_RADIUS_M = 15000;
// Écart maximal entre l'étape et le lieu de la page Visorando trouvée par son nom (voir fetchVisorandoHikes).
const VISORANDO_MAX_OFFSET_KM = 25;
const OSM_HIKE_MAX_KM = 40;
const OSM_HIKE_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const osmHikeCache = new Map();
const HIKE_NETWORK_RANK = { lwn: 0, rwn: 1, nwn: 2, iwn: 3 };
function parseKm(v){
  const m = String(v || '').replace(',', '.').match(/^\s*(\d+(?:\.\d+)?)\s*(km)?\s*$/i);
  return m ? parseFloat(m[1]) : null;
}
function pickHikeTags(tags){
  const out = {};
  for(const k of Object.keys(tags)){
    if(/^(name(:[a-z]{2,3})?|distance|network|sac_scale|osmc:symbol|ref|website|description|operator)$/.test(k) && typeof tags[k] === 'string') out[k] = tags[k].slice(0, 300);
  }
  return out;
}
async function fetchOsmHikes(lat, lon, lang){
  const cacheKey = lat.toFixed(2) + ',' + lon.toFixed(2);
  const cached = osmHikeCache.get(cacheKey);
  let elements = cached && (Date.now() - cached.ts) < OSM_HIKE_CACHE_TTL_MS ? cached.elements : null;
  if(!elements){
    const query = '[out:json][timeout:25];relation["route"~"^(hiking|foot)$"]["name"](around:' + OSM_HIKE_RADIUS_M + ',' + lat + ',' + lon + ');out tags center 60;';
    const data = await queryOverpassMirrors(query, 'randonnées ' + lat + ',' + lon);
    if(!data) return null; // échec réseau : pas mis en cache
    // Étiquettes utiles seulement (11e audit du 19/09/2026) : le cache gardait TOUTES les étiquettes de 60 relations par
    // entrée, sur 5 000 entrées — jusqu'à quelques centaines de Mo. Gardés : nom (et ses traductions), distance, réseau,
    // difficulté, référence, site.
    elements = (data.elements || []).map(e => ({ id: e.id, tags: pickHikeTags(e.tags || {}), lat: e.center && e.center.lat, lon: e.center && e.center.lon }));
    cacheSet(osmHikeCache, cacheKey, { elements, ts: Date.now() });
  }
  const out = [];
  const seenNames = new Set();
  elements.forEach(e => {
    const t = e.tags;
    const km = parseKm(t.distance);
    if(km !== null && km > OSM_HIKE_MAX_KM) return;
    if(km === null && (t.network === 'iwn' || t.network === 'nwn')) return;
    const name = (lang && t['name:' + lang]) || t.name;
    if(!name || seenNames.has(name.toLowerCase())) return;
    seenNames.add(name.toLowerCase());
    out.push({
      name: name,
      url: 'https://hiking.waymarkedtrails.org/#route?id=' + e.id,
      distance: km !== null ? (Math.round(km * 10) / 10) + ' km' : null,
      duration: null,
      difficulty: null,
      source: 'OpenStreetMap',
      rank: (t.network in HIKE_NETWORK_RANK ? HIKE_NETWORK_RANK[t.network] : 1) * 10 + (km === null ? 1 : 0),
      d: (e.lat != null) ? haversineKm(lat, lon, e.lat, e.lon) : 99
    });
  });
  // Proximité d'abord (centre de l'itinéraire), avec un léger avantage aux réseaux locaux : un sentier régional à 12 km,
  // de l'autre côté d'un massif ou d'une frontière, ne doit pas passer devant une boucle locale à 2 km.
  out.sort((a, b) => (a.d + a.rank * 0.3) - (b.d + b.rank * 0.3));
  return out.slice(0, 10).map(h => { delete h.rank; delete h.d; return h; });
}
// Portails de randonnée de référence par pays (scripts/hiking/, recherche sourcée) : simple lien « Plus de randonnées ».
function hikingPortalsFor(country, name, lat, lon){
  const list = (HIKING_DATA.portals || []).filter(p => p.country === country);
  return list.map(p => ({
    name: p.name,
    url: p.url.replace(/\{town\}/g, encodeURIComponent(name)).replace(/\{lat\}/g, isFinite(lat) ? String(lat) : '')
      .replace(/\{lon\}/g, isFinite(lon) ? String(lon) : '')
  })).filter(p => !/\{|\}/.test(p.url) && /^https:\/\//.test(p.url));
}

app.get('/api/hike', async (req, res) => {
  const name = String(req.query.name || '').trim();
  if(!name || name.length > 120){
    return res.status(400).json({ error: 'invalid name', hikes: [] });
  }
  const country = String(req.query.country || '').trim().toUpperCase();
  const lat = parseFloat(req.query.lat), lon = parseFloat(req.query.lon);
  const lang = /^[a-z]{2,3}$/.test(String(req.query.lang || '')) ? String(req.query.lang) : '';
  const coordsOk = isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  // Pays connu ET coordonnées valides exigés (3e audit du 17/09/2026) : sans pays, la route appelait Visorando pour
  // n'importe quel nom — un relais ouvert vers un tiers, et de quoi remplir le cache de requêtes sans résultat.
  if(!Object.prototype.hasOwnProperty.call(TripDataCountries, country) || !coordsOk){
    return res.status(400).json({ error: 'invalid place', hikes: [] });
  }
  const useVisorando = (HIKING_DATA.visorandoCountries || ['FR']).includes(country);
  let hikes = [];
  if(useVisorando){
    try {
      const list = (await fetchVisorandoHikeList(name)) || [];
      // Page d'un homonyme lointain (ou page générique) : ignorée, les itinéraires OpenStreetMap prennent le relais.
      const center = list.center;
      const farAway = coordsOk && center && haversineKm(lat, lon, center.lat, center.lon) > VISORANDO_MAX_OFFSET_KM;
      // Une journée = une randonnée : les itinéraires de plusieurs jours (« 4 jours ») ou de plus de OSM_HIKE_MAX_KM
      // (« 64,43 km », Panorama Rundweg Thunersee) sont écartés, comme pour OpenStreetMap.
      if(!farAway) hikes = list.filter(h => {
        const km = parseFloat(String(h.distance || '').replace(',', '.'));
        return !(isFinite(km) && km > OSM_HIKE_MAX_KM) && !/jour/i.test(String(h.duration || ''));
      }).map(h => Object.assign({ source: 'Visorando' }, h));
    } catch(err){ /* silencieux */ }
  }
  if(!hikes.length && coordsOk && country && TripDataCountries[country]){
    try { hikes = (await fetchOsmHikes(lat, lon, lang)) || []; } catch(err){ /* silencieux */ }
  }
  res.json({ hikes, portals: country ? hikingPortalsFor(country, name, lat, lon) : [] });
});

app.get('/api/pois', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const name = String(req.query.name || '').normalize('NFC').trim();
  const country = String(req.query.country || '').trim().toUpperCase();
  // Département : pour la France, un vrai code de DEPARTMENTS (sinon ignoré) ; ailleurs, nom de région en clair, borné
  // et normalisé — une valeur arbitraire ne crée plus une entrée de cache (ni une recherche Wikipédia) par variante.
  const deptRaw = String(req.query.dept || '').normalize('NFC').trim();
  const dept = country === 'FR'
    ? (Object.prototype.hasOwnProperty.call(DEPARTMENTS, deptRaw.toUpperCase()) ? deptRaw.toUpperCase() : '')
    : deptRaw.slice(0, 40);
  // Garde-fou contre l'usage de ce point d'accès comme relais Overpass générique. Jusqu'en septembre
  // 2026, c'était une BOÎTE de coordonnées élargie pays par pays à chaque ajout européen (Andalousie,
  // Wadden, Sylt, Salento, Malte, Shetland, Dingle…) — mais jamais au-delà de lat 35,7-61 / lon
  // -10,5-24,2. Tous les pays ajoutés ensuite hors de cette boîte (Islande, Féroé, Turquie, Caucase,
  // Proche-Orient, Maghreb, toute l'Afrique) recevaient donc un 400 silencieux : aucune activité
  // réelle, sans la moindre erreur visible — le client affiche une liste vide dans ce cas. Découvert en
  // testant un trajet kényan. Remplacé par un contrôle qui ne dépend plus de la géographie : code pays
  // réellement couvert par l'application (COUNTRIES de trip-data.js) et coordonnées valides.
  if(!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180){
    return res.status(400).json({ error: 'invalid coordinates', pois: [] });
  }
  if(!TripDataCountries[country]){
    return res.status(400).json({ error: 'unknown country', pois: [] });
  }
  if(name.length > 120){
    return res.status(400).json({ error: 'invalid name', pois: [] });
  }
  // Clé par nom+département plutôt que seules les coordonnées arrondies : plus fiable pour ne
  // jamais confondre deux communes proches, et cohérent avec la recherche Wikipédia (par nom).
  const cacheKey = lat.toFixed(2) + ',' + lon.toFixed(2) + '|' + cacheKeyPart(name) + '|' + cacheKeyPart(dept) + '|' + country;
  const cached = poiCache.get(cacheKey);
  if(cached && (Date.now() - cached.ts) < POI_CACHE_TTL_MS){
    return res.json({ pois: cached.pois });
  }
  let pois = null;
  try {
    pois = await fetchAllRealPOIs(lat, lon, name, dept, country);
  } catch(err){
    console.warn('[pois] échec pour ' + JSON.stringify(cacheKey) + ':', err.message);
  }
  // Ne met en cache que les échecs "propres" (requête aboutie, 0 résultat) — jamais un échec de
  // requête (les deux miroirs Overpass down), pour ne pas figer un faux négatif ; la prochaine
  // visite sur cette commune retentera au lieu de rester bloquée dessus pendant 14 jours.
  // Idem pour un résultat partiel (Wikipédia en échec ou saturé, voir fetchAllRealPOIs).
  if(pois !== null && !pois.partial){
    cacheSet(poiCache, cacheKey, { pois, ts: Date.now() });
  }
  res.json({ pois: pois || [] }); // le client ne voit jamais l'échec : juste une liste vide
});

app.get('/api/photo', async (req, res) => {
  const name = String(req.query.name || '').normalize('NFC').trim();
  const dept = String(req.query.dept || '').normalize('NFC').trim().slice(0, 40);
  // Code pays à deux lettres seulement (2e audit du 17/09/2026) : une valeur libre allongeait la clé de cache.
  const countryRaw = String(req.query.country || '').trim().toUpperCase();
  const country = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : '';
  const lang = sanitizeLangCode(req.query.lang);
  if(!name || name.length > 120){
    return res.status(400).json({ error: 'invalid name' });
  }
  // Point de référence (lieu OSM, étape ou commune) et rayon selon sa précision : voir wikiPlaceMatches.
  const nLat = parseFloat(req.query.lat), nLon = parseFloat(req.query.lon);
  const kind = Object.prototype.hasOwnProperty.call(PHOTO_NEAR_KM, req.query.kind) ? req.query.kind : 'stop';
  const near = (isFinite(nLat) && isFinite(nLon) && Math.abs(nLat) <= 90 && Math.abs(nLon) <= 180)
    ? { lat: nLat, lon: nLon, km: PHOTO_NEAR_KM[kind] } : null;
  // Clé normalisée (voir cacheKeyPart) : le nom envoyé à Wikipédia reste celui reçu, seule la clé ignore la casse.
  const cacheKey = cacheKeyPart(name) + '|' + cacheKeyPart(dept) + '|' + country + '|' + lang + '|' + (near ? nLat.toFixed(2) + ',' + nLon.toFixed(2) + ',' + kind : '-');
  const cached = photoCache.get(cacheKey);
  if(cached && (Date.now() - cached.ts) < CACHE_TTL_MS){
    return res.json(cached.data);
  }
  let data;
  const ctx = { failed: false };
  try {
    data = await resolvePlacePhoto(name, dept, country, lang, near, ctx);
  } catch(err){
    ctx.failed = true;
    data = { image: null, imageFull: null, wikiUrl: null, title: null };
  }
  // Pas de mise en cache d'un échec (réseau, délai, 429, 5xx, service saturé) : seulement des réponses abouties,
  // y compris « pas de photo » quand Wikipédia a bien répondu. Une photo trouvée malgré un essai en échec est gardée.
  if(!ctx.failed || data.image) cacheSet(photoCache, cacheKey, { data, ts: Date.now() });
  res.json(data);
});

// ============ EXPORT PDF ============
// Un vrai fichier .pdf téléchargeable en un clic (pas la fenêtre d'impression du navigateur) :
// pdfkit est du JS pur (aucun binaire externe type Chromium/wkhtmltopdf), donc sans souci sur un
// hébergement mutualisé. Le client envoie l'état ACTUEL du voyage tel qu'affiché à l'écran (voir
// buildTripExportPayload dans app.js — POI réels et randonnée Visorando déjà résolus si trouvés) ;
// le serveur ne fait que la mise en page. Rien n'est conservé ni journalisé au-delà de la réponse.
// Journal : en cas d'erreur, son type seulement, jamais son message (13e audit du 19/09/2026, voir pdfErrorKind).

// Liens cliquables du PDF (audit du 17/09/2026) : https seulement, vers les hôtes que l'application produit elle-même —
// un lien arbitraire envoyé par un client ferait du PDF « officiel » du site un porteur d'hameçonnage. Ensemble calculé
// une fois au démarrage : hôtes des URL de LODGING_RULES, VAN_RULES, MOTO_RULES, des vignettes (COUNTRIES) et des
// portails de randonnée (data/hiking.json), plus les familles d'hôtes ci-dessous (logement, randonnée, Wikipédia).
const PDF_LINK_HOST_PATTERNS = [
  // Airbnb : l'hôte EXACT produit par le moteur (lib/trip-engine.js, lodgingLinks). Le motif précédent acceptait
  // n'importe quelle extension — « airbnb.zip », « airbnb.top », enregistrables par n'importe qui — ce qui permettait de
  // faire pointer le bouton « Logement » d'un PDF officiel vers un domaine d'hameçonnage (3e audit du 17/09/2026).
  /^www\.airbnb\.fr$/,
  /^(?:[a-z0-9-]+\.)*booking\.com$/,
  /^(?:[a-z0-9-]+\.)*visorando\.com$/,
  /^hiking\.waymarkedtrails\.org$/,
  /^(?:[a-z0-9-]+\.)*(?:wikipedia|wikimedia)\.org$/
];
const PDF_LINK_HOSTS = (function(){
  const hosts = new Set();
  function addUrl(u){
    try { const p = new URL(u); if(p.protocol === 'https:') hosts.add(p.hostname.toLowerCase()); } catch(e){ /* URL modèle invalide */ }
  }
  function scan(value){
    const matches = JSON.stringify(value || null).match(/https:\/\/[^"\s\\]+/g) || [];
    matches.forEach(addUrl);
  }
  scan(TripData.LODGING_RULES);
  scan(TripData.VAN_RULES);
  scan(TripData.MOTO_RULES);
  Object.keys(TripDataCountries).forEach(function(cc){ const v = TripDataCountries[cc].vignette; if(v && v.url) addUrl(v.url); });
  (HIKING_DATA.portals || []).forEach(function(p){ if(p && typeof p.url === 'string') addUrl(p.url.replace(/\{[a-z]+\}/g, 'x')); });
  return hosts;
})();
// Lien écrit dans le PDF = forme ANALYSÉE (URL.href), jamais la chaîne reçue (12e audit du 19/09/2026) : le contrôle
// portait sur new URL(u) mais c'est u qui était écrit — « https://www.booking.com\@evil.example/phish » (hôte
// booking.com pour l'analyseur WHATWG, evil.example pour d'autres), une tabulation ou une espace en tête passaient tels
// quels jusqu'au lecteur PDF. Refusés aussi : barre oblique inverse et « @ » n'importe où (sans usage dans les liens
// produits par l'application, ils ne servent qu'à tromper un autre analyseur ou le lecteur), identifiant ou mot de
// passe, port explicite, et toute forme analysée non ASCII ou contenant une espace.
function parseHttpsUrl(u){
  if(typeof u !== 'string' || u.length >= 500 || /[\\@]/.test(u)) return null;
  let p;
  try { p = new URL(u); } catch(e){ return null; }
  if(p.protocol !== 'https:' || p.username || p.password || p.port) return null;
  if(!/^[\x21-\x7e]+$/.test(p.href) || /[\\@]/.test(p.href)) return null;
  return p;
}
// Lien autorisé du PDF (voir PDF_LINK_HOSTS) : sa forme analysée, sinon null.
function pdfLink(u){
  const p = parseHttpsUrl(u);
  if(!p) return null;
  const host = p.hostname.toLowerCase();
  return (PDF_LINK_HOSTS.has(host) || PDF_LINK_HOST_PATTERNS.some(re => re.test(host))) ? p.href : null;
}
// Zones à tension : source France Diplomatie uniquement (forme analysée, voir parseHttpsUrl), sinon null.
function diplomatieLink(u){
  const p = parseHttpsUrl(u);
  return p && /^(?:www\.)?diplomatie\.gouv\.fr$/i.test(p.hostname) ? p.href : null;
}
// Niveau de tension envoyé par le client ({level:'red'|'orange', source?}) : validé strictement, sinon ignoré.
function pdfTension(t){
  if(!t || typeof t !== 'object' || Array.isArray(t)) return null;
  if(t.level !== 'red' && t.level !== 'orange') return null;
  return { level: t.level, source: diplomatieLink(t.source) };
}
function pdfTensionText(tension, isDeparture){
  const where = isDeparture ? 'Point de départ situé en zone ' : 'Étape située en zone ';
  const level = tension.level === 'red' ? 'formellement déconseillée' : 'déconseillée sauf raison impérative';
  return 'ATTENTION — ' + where + level + ' par le ministère des Affaires étrangères' +
    (tension.source ? ' (source : France Diplomatie, conseils aux voyageurs)' : '') +
    '. Consultez les conseils aux voyageurs avant de partir.';
}
// Filet de sécurité contre un payload abusif (chaîne énorme) qui ralentirait inutilement la mise
// en page du PDF — jamais atteint en usage normal, l'app elle-même ne produit rien d'aussi long.
function clip(s, max){
  // Chaînes, nombres et booléens seulement (9e audit du 18/09/2026) : un objet forgé ({"toString":1}) faisait lever
  // String() en pleine mise en page du PDF, livré alors coupé net, sans la mention « document tronqué ».
  s = (typeof s === 'string') ? s : (typeof s === 'number' || typeof s === 'boolean') ? String(s) : '';
  // Sauts de ligne remplacés par une espace (12e audit du 19/09/2026) : drawText fait de chaque « \n » un paragraphe,
  // et un corps de 32 Ko de « x\n » produisait 198 pages. Tout texte venu du client passe
  // par ici (directement ou par pdfClientText / pdfClientList / pdfClientBadge).
  s = s.replace(/[\r\n\u2028\u2029]+/g, ' ');
  if(s.length <= max) return s;
  // Coupure entre deux points de code (13e audit du 19/09/2026) : slice coupait en unités UTF-16 et laissait la moitié
  // haute d'un emoji (paire de substitution) avant « … », dessinée comme un carré vide. La borne reste en unités UTF-16
  // (même taille maximale qu'avant pour tous les appelants) ; on recule d'une unité si la coupure tombe dans une paire.
  let end = max - 1;
  const last = s.charCodeAt(end - 1);
  if(end > 0 && last >= 0xD800 && last <= 0xDBFF) end--;
  return s.slice(0, end) + '…';
}

// Palette approximative des tokens CSS du site (voir public/css/style.css, thème clair) — pdfkit
// ne peut pas lire les variables CSS, donc on les recopie ici en dur. Polices : Noto embarquées (dossier pdf-fonts/, voir
// lib/pdf-text.js) — les 14 polices standard PDF (Helvetica/Times) ne couvraient ni le cyrillique, ni le grec, ni
// l'arabe, ni les écritures d'Asie, ni même « ł » ou « ő » : un PDF en japonais ou en polonais sortait illisible.
// Langues acceptées pour le PDF : celles de l'interface (SUPPORTED de public/js/i18n.js, lu une fois au démarrage).
const PDF_LANGS = (function(){
  try {
    const src = fs.readFileSync(path.join(__dirname, 'public', 'js', 'i18n.js'), 'utf8').slice(0, 20000);
    const m = src.match(/var SUPPORTED = \[([^\]]*)\]/);
    return new Set(m ? m[1].split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean) : ['fr']);
  } catch(e){ return new Set(['fr']); }
})();
const PDF_INK = '#1A1F1C';
const PDF_INK_SOFT = '#4A544D';
const PDF_ACCENT = '#B04A19';   // --accent (orange) : titre, badge retour, ligne "fin de mission"
const PDF_ACCENT_2 = '#8A6414'; // --accent-2 (moutarde) : activités "à faire sur place"
const PDF_ACCENT_3 = '#1F4F44'; // --accent-3 (teal) : badges de jour, liens (rando/logement), sac
const PDF_BG = '#F6F1E2';       // --surface : fond du bandeau d'en-tête
const PDF_BG_ALT = '#ECE4CC';   // --surface-2 : fond des jetons de statistiques
const PDF_LINE = '#C9C2A0';
const PDF_LINE_STRONG = '#8F8564'; // ligne de jonction entre les badges de jour ("timeline")
const PDF_DANGER = '#B3261E';      // zone à tension « rouge » (formellement déconseillée)
// Plafond de PUCES listées par étape (audit du 17/09/2026 ; une puce peut occuper plusieurs lignes) : une étape peut en
// lister jusqu'à ~30 (restrictions, activités, logements…), une étape ordinaire une douzaine ; les avertissements de zone
// à tension ne sont jamais retirés par ce plafond.
const PDF_MAX_BULLETS_PER_LEG = 20;
// Budget de mise en page d'un export (3e audit du 17/09/2026). Le plafond de puces ne bornait QUE leur nombre, pas leur
// longueur : un corps de 109 Ko en hindi (sous la limite de taille) demandait 20 s de mise en page, pendant lesquelles le
// process — synchrone — ne répondait plus à personne. Au-delà de ce budget, la mise en page s'arrête et le document porte
// la mention « document tronqué ». Un export réel coûte 0,1 à 2,2 s selon l'écriture (dzongkha puis bengali les plus lents).
const PDF_BUILD_BUDGET_MS = 3500;

// Boutiques OFFICIELLES de vignette autoroutière (pas de revendeur tiers) : COUNTRIES[cc].vignette.url de
// public/js/trip-data.js, la même donnée que l'écran (source unique, 12e audit du 19/09/2026). L'ancienne copie en dur
// ici — justifiée par un commentaire faux, trip-data.js étant déjà importé plus haut — ne connaissait que six pays : la
// Bulgarie, la Roumanie, la Moldavie et la Biélorussie n'avaient aucun rappel de vignette dans le PDF. Chaque lien passe
// par les mêmes contrôles que les autres liens du PDF (https, sans identifiant ni port, forme analysée) ; un lien
// invalide dans la donnée retire le pays plutôt que d'écrire un lien douteux. Voir buildTripPdf pour l'usage.
const VIGNETTE_URLS = (function(){
  const out = Object.create(null);
  Object.keys(TripDataCountries).forEach(function(cc){
    const v = TripDataCountries[cc] && TripDataCountries[cc].vignette;
    const p = v && parseHttpsUrl(v.url);
    if(/^[A-Z]{2}$/.test(cc) && p) out[cc] = p.href;
  });
  return out;
})();

// Fond crème (--bg du site) plutôt qu'une page blanche brute — posé sous tout le reste à chaque
// nouvelle page (page 1 explicitement, pages suivantes via pdfRunningHeader/'pageAdded').
function pdfPageBackground(doc){
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PDF_BG);
}

function pdfEnsureSpace(doc, minHeight){
  const bottom = doc.page.height - doc.page.margins.bottom;
  if(doc.y + minHeight > bottom) doc.addPage();
}

// Mise en page du texte : lib/pdf-text.js (polices Noto embarquées, repli caractère par caractère, ordre bidirectionnel,
// coupure des lignes des écritures sans espaces). `ctx` : { lang, rtl } du document. En langue de droite à gauche, toute
// la page est en miroir : X logique (depuis le bord de départ de la ligne) -> X réel via pdfX.
function pdfX(doc, ctx, x, width){
  return ctx.rtl ? doc.page.width - x - width : x;
}
function pdfText(doc, ctx, str, x, width, opts){
  // Budget épuisé : plus aucun texte n'est préparé (9e audit du 18/09/2026). drawText ne contrôlait le budget qu'à
  // partir de sa première ligne, après le choix des polices, l'ordre bidirectionnel et la coupure des lignes — des
  // textes longs en écriture complexe dépassaient ainsi le budget de 45 % (4,9 s mesurées pour 3,5 s).
  if(pdfTimeUp(ctx)) return;
  opts = opts || {};
  PdfText.drawText(doc, str, { x: pdfX(doc, ctx, x, width), width: width, lang: ctx.lang, size: opts.size || 10,
    bold: !!opts.bold, color: opts.color || PDF_INK, link: opts.link || null, underline: !!opts.link, align: opts.align,
    // Bas de page et budget de temps : un paragraphe long change de page au lieu d'être écrit hors de la feuille, et la
    // mise en page s'arrête net si le budget est dépassé (voir PDF_BUILD_BUDGET_MS).
    bottom: doc.page.height - doc.page.margins.bottom, onPageBreak: function(){ doc.addPage(); return doc.y; },
    deadline: ctx.deadline });
}

// Puce colorée (point plein) ou case à cocher (carré creux, pour le sac à préparer) suivie du
// texte — le point/la case est dessiné séparément du texte pour pouvoir lui donner une couleur
// différente selon la nature de la ligne (péage, activité, lien réel...), comme les icônes du site.
function pdfBullet(doc, ctx, text, x, width, opts){
  if(pdfTimeUp(ctx)) return; // voir pdfText
  opts = opts || {};
  pdfEnsureSpace(doc, 24);
  const size = 9.5;
  const markY = doc.y + size * 0.75;
  if(opts.checkbox){
    doc.lineWidth(1).rect(pdfX(doc, ctx, x - 3, 6.4), markY - 3.2, 6.4, 6.4).stroke(PDF_ACCENT_3);
  } else {
    doc.circle(pdfX(doc, ctx, x, 0), markY, 2.1).fill(opts.color || PDF_INK_SOFT);
  }
  pdfText(doc, ctx, text, x + 11, width - 11, { size: size, bold: opts.bold, link: opts.link,
    color: opts.textColor || (opts.link ? PDF_ACCENT_3 : PDF_INK) });
  doc.y += 1.5;
}

// Jeton arrondi façon ".stats span" du site (voir style.css) — la largeur dépend du texte, donc on
// la mesure avant de dessiner ; revient à la ligne si la suivante dépasserait la largeur utile.
function pdfChipRow(doc, ctx, items, x, maxWidth){
  const padX = 8, padY = 4.5, fontSize = 9, h = fontSize + padY * 2 + 2, gap = 6;
  const colors = [PDF_ACCENT_3, PDF_ACCENT_2, PDF_ACCENT];
  let cx = x, cy = doc.y, rowH = h;
  items.forEach(function(text, i){
    // Budget de mise en page (10e audit du 18/09/2026) : ces jetons y échappaient — 8 statistiques de 80 caractères
    // tibétains (2 Ko de corps) gelaient le process 5 à 10 s.
    if(pdfTimeUp(ctx)) return;
    const fullW = PdfText.textWidth(doc, text, { lang: ctx.lang, size: fontSize, bold: true }) + padX * 2;
    const w = Math.min(fullW, maxWidth);
    // Pastille plus large que la page (12e audit du 19/09/2026, pastilles portées à 140 caractères) : sur plusieurs
    // lignes (3 au plus) au lieu d'une seule ligne coupée net — fond agrandi de la hauteur des lignes en plus.
    const lineOpts = { x: 0, y: 0, width: w - padX * 2 + 1, lang: ctx.lang, size: fontSize, bold: true, measureOnly: true };
    const extraH = fullW > maxWidth
      ? PdfText.drawText(doc, text, Object.assign({}, lineOpts, { maxLines: 3 })) - PdfText.drawText(doc, text, Object.assign({}, lineOpts, { maxLines: 1 }))
      : 0;
    const chipH = h + Math.max(0, extraH);
    if(cx > x && cx + w > x + maxWidth){ cx = x; cy += rowH + gap; rowH = h; }
    const realX = pdfX(doc, ctx, cx, w);
    doc.roundedRect(realX, cy, w, chipH, h / 2).fill(colors[i % colors.length]);
    PdfText.drawText(doc, text, { x: realX + padX, y: cy + padY - 1, width: w - padX * 2 + 1, lang: ctx.lang, size: fontSize,
      bold: true, color: '#FFFFFF', align: 'center', maxLines: extraH > 0 ? 3 : 1, deadline: ctx.deadline });
    rowH = Math.max(rowH, chipH);
    cx += w + gap;
  });
  doc.y = cy + rowH;
}

// Bandeau de marque affiché en haut de chaque page suivant la première (qui a le grand bandeau
// complet, voir buildTripPdf) — juste assez pour rester identifiable si l'itinéraire déborde sur
// plusieurs pages, sans reproduire tout l'en-tête à chaque fois.
function pdfRunningHeader(doc, ctx, marginLeft, contentWidth, tripLabel){
  pdfPageBackground(doc);
  doc.rect(0, 0, doc.page.width, 34).fill(PDF_BG_ALT);
  const half = contentWidth / 2;
  PdfText.drawText(doc, "CAP SUR L'INCONNU", { x: pdfX(doc, ctx, marginLeft, half), y: 11, width: half, lang: 'fr', size: 10,
    bold: true, color: PDF_ACCENT, align: ctx.rtl ? 'right' : 'left', maxLines: 1 });
  if(!pdfTimeUp(ctx)){ // voir pdfChipRow (10e audit)
    PdfText.drawText(doc, clip(tripLabel, 60), { x: pdfX(doc, ctx, marginLeft + half, half), y: 12, width: half, lang: ctx.lang,
      size: 8.5, color: PDF_INK_SOFT, align: ctx.rtl ? 'left' : 'right', maxLines: 1, deadline: ctx.deadline });
  }
  doc.y = doc.page.margins.top;
}

// Texte traduit fourni par le navigateur (langue d'interface) : chaîne non vide, bornée ; sinon le texte français
// composé ici. Le serveur ne traduit rien lui-même : toutes les traductions vivent dans public/js/i18n.js.
// Budget de mise en page épuisé : plus aucune ligne n'est ajoutée (voir PDF_BUILD_BUDGET_MS).
function pdfTimeUp(ctx){
  if(!ctx.deadline) return false;
  if(performance.now() > ctx.deadline){ ctx.truncated = true; return true; }
  return false;
}
function pdfClientText(v, fallback, max){
  return (typeof v === 'string' && v.trim()) ? clip(v, max || 400) : fallback;
}
function pdfClientList(v, maxItems, maxLen){
  return Array.isArray(v) ? v.filter(s => typeof s === 'string' && s.trim()).slice(0, maxItems).map(s => clip(s, maxLen)) : null;
}
// Libellé du badge d'une étape fourni par le navigateur (champ `badge` de chaque élément de trip.legs, 12e audit du
// 19/09/2026) : l'écran affiche les chiffres de la langue (« ३ », « ٣ »), « ⟲ » pour le retour et des plages « 3–5 »,
// le PDF écrivait toujours « 3 » ou « R ». Chaîne courte (12 caractères au plus), sans caractère de contrôle ni de
// sens d'écriture (un badge ne doit pas réordonner la ligne), entièrement dessinable avec les polices du PDF (13e audit,
// voir pdfClientBadge) ; sinon null et le libellé calculé ici.
const PDF_BADGE_BAD_RE = /[\p{Cc}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029]/u;
// Textes de secours du péage (12e audit du 19/09/2026, utilisés seulement sans texte du navigateur) : fourchette de la
// 11e passe, même règle que tollRange / tollRangeKind de public/js/app.js. Borne haute = amountMax, sinon amount ; borne
// basse = amountMin, sinon la borne haute (moteur plus ancien : montant unique). 'upTo' : borne basse nulle (des routes
// gratuites longent le trajet) ; 'single' : écart de moins de 0,50 € ou de moins de 10 % ; 'range' sinon. Nombres bornés.
function pdfTollRange(t){
  const num = v => { const n = Number(v); return isFinite(n) ? Math.min(Math.max(n, 0), 100000) : null; };
  const max = num(t.amountMax != null ? t.amountMax : t.amount) || 0;
  const minRaw = t.amountMin != null ? num(t.amountMin) : max;
  const min = Math.min(minRaw == null ? max : minRaw, max);
  const kind = !(min > 0) ? 'upTo' : (max - min < 0.5 || max - min < 0.1 * max) ? 'single' : 'range';
  return { min: min, max: max, kind: kind };
}
function pdfEuro(n){ return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
// « ~X € » (montant unique : borne haute, comme l'écran) ou « ~A à ~B € ».
function pdfTollAmountText(r){
  return r.kind === 'range' ? '~' + pdfEuro(r.min) + ' à ~' + pdfEuro(r.max) + ' €' : '~' + pdfEuro(r.max) + ' €';
}
function pdfClientBadge(v){
  if(typeof v !== 'string') return null;
  const s = v.trim();
  if(!s || Array.from(s).length > 12 || PDF_BADGE_BAD_RE.test(s)) return null;
  // 13e audit du 19/09/2026 :
  // - libellé dont un caractère n'a de glyphe dans AUCUNE police du PDF (« ⟲ » du retour, emoji) : refusé, le libellé
  //   calculé ici (« R », numéro) le remplace — sinon le rond affichait un carré vide (glyphe .notdef). Les chiffres des
  //   161 langues de l'interface et le tiret « – » des plages sont tous couverts (vérifié avec Intl.NumberFormat) ;
  // - plus de clip(s, 12) : la longueur est déjà bornée à 12 POINTS DE CODE ci-dessus, et clip, qui compte en unités
  //   UTF-16, coupait 7 emoji (14 unités) au milieu d'une paire de substitution. Sauts de ligne et caractères de contrôle
  //   sont déjà refusés par PDF_BADGE_BAD_RE ; une moitié de paire isolée l'est par PdfText.canRender.
  if(!PdfText.canRender(s)) return null;
  return s;
}

// Distances écrites par le serveur lui-même (13e audit du 19/09/2026) : textes de secours seulement — les textes traduits
// du navigateur, prioritaires, sont déjà dans l'unité choisie. payload.distanceUnit = 'mi' : valeur convertie (1 mi =
// 1,609344 km) puis arrondie à l'unité, comme les kilomètres ; toute autre valeur : kilomètres. Les valeurs reçues et
// les bornes contrôlées restent en kilomètres. Recensement des distances écrites par le serveur dans le PDF : total
// (pastille), distance d'étape et partie routière d'une traversée, distance max / éloignement minimum (overMaxLeg),
// rayon de recherche des bornes (noCharger). Hors PDF, seule /api/pois écrit une distance (« 12 km », randonnées
// OpenStreetMap) : donnée transmise au navigateur, qui la met en forme lui-même.
const KM_PER_MILE = 1.609344;
function pdfDistanceUnit(v){ return v === 'mi' ? 'mi' : 'km'; }
function pdfDist(km, unit){ return Math.round(unit === 'mi' ? km / KM_PER_MILE : km); }
function pdfDistText(km, unit){ return pdfDist(km, unit) + ' ' + unit; }

function buildTripPdf(doc, trip){
  const marginLeft = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const tripLabel = trip.tripLabel || trip.city || '';
  // Langue du document : code connu de l'interface (voir PDF_LANGS), français sinon.
  const lang = typeof trip.lang === 'string' && PDF_LANGS.has(trip.lang) ? trip.lang : 'fr';
  const ctx = { lang: lang, rtl: PdfText.isRtlLang(lang), deadline: performance.now() + PDF_BUILD_BUDGET_MS, truncated: false };
  const texts = (trip.texts && typeof trip.texts === 'object' && !Array.isArray(trip.texts)) ? trip.texts : {};
  // Unité des distances (payload.distanceUnit, voir pdfDistText) et mode de transport (payload.transportKey : clé de
  // TRANSPORT dans public/js/trip-data.js, ignorée sinon) — 13e audit du 19/09/2026.
  const unit = pdfDistanceUnit(trip.distanceUnit);
  const transportKey = typeof trip.transportKey === 'string' && Object.prototype.hasOwnProperty.call(TripData.TRANSPORT, trip.transportKey)
    ? trip.transportKey : null;
  // Mode sans classe de péage (vélo : tollClass null) : aucune autoroute, donc aucun rappel de vignette autoroutière — le
  // PDF en affichait une (Suisse, Autriche…) pour un voyage à vélo.
  const noVignette = !!transportKey && TripData.TRANSPORT[transportKey].tollClass == null;

  // Pages 2+ (si l'itinéraire déborde) : bandeau réduit, voir pdfRunningHeader. La page 1 existe
  // déjà à la construction du document (pdfkit l'ajoute avant qu'on ait pu s'abonner à
  // 'pageAdded') : elle n'est donc jamais concernée par ce bandeau réduit, seulement par le grand
  // en-tête ci-dessous — exactement le partage voulu entre les deux.
  doc.on('pageAdded', function(){ pdfRunningHeader(doc, ctx, marginLeft, contentWidth, tripLabel); });

  // ---- Grand bandeau d'en-tête (page 1 uniquement) ----
  pdfPageBackground(doc);
  doc.rect(0, 0, doc.page.width, 96).fill(PDF_ACCENT);
  PdfText.drawText(doc, "CAP SUR L'INCONNU", { x: marginLeft, y: 24, width: contentWidth, lang: 'fr', size: 22, bold: true,
    color: '#FFFFFF', align: ctx.rtl ? 'right' : 'left', maxLines: 1 });
  PdfText.drawText(doc, pdfClientText(texts.subtitle, clip(trip.city, 80) + ' — itinéraire mystère', 160),
    { x: marginLeft, y: 58, width: contentWidth, lang: lang, size: 12.5, color: '#FBE7D6', maxLines: 1, deadline: ctx.deadline });
  doc.y = 114;
  doc.x = marginLeft;

  // ---- Jetons de statistiques ----
  const stats = trip.stats || {};
  // 140 caractères par pastille (12e audit du 19/09/2026) : 80 coupaient au milieu d'un mot les traductions réelles de
  // « ferry (véhicules ; passagers en plus…) » (bulgare 85, lituanien 91, maya yucatèque 100 caractères).
  let statsBits = pdfClientList(texts.stats, 8, 140);
  if(!statsBits || !statsBits.length){
    statsBits = [];
    // Nombres uniquement (une chaîne de 400 Ko passait telle quelle dans la mise en page).
    const statNum = v => { const n = Math.round(Number(v)); return isFinite(n) && n >= 0 && n < 100000 ? n : null; };
    const sDays = statNum(stats.days), sCities = statNum(stats.cities), sNights = statNum(stats.nights);
    if(sDays) statsBits.push(sDays + (sDays > 1 ? ' jours' : ' jour'));
    if(sCities) statsBits.push(sCities + (sCities > 1 ? ' villes' : ' ville'));
    if(sNights != null) statsBits.push(sNights + (sNights > 1 ? ' nuitées' : ' nuitée'));
    if(statNum(stats.totalKm)) statsBits.push('~' + pdfDistText(statNum(stats.totalKm), unit) + ' au total');
    if(stats.toll && typeof stats.toll === 'object' && isFinite(Number(stats.toll.amountMax != null ? stats.toll.amountMax : stats.toll.amount))){
      // Fourchette (11e passe, voir pdfTollRange) : mêmes trois cas que les statistiques de l'écran.
      const r = pdfTollRange(stats.toll), on = !!stats.toll.enabled;
      if(r.kind === 'upTo') statsBits.push("jusqu'à ~" + pdfEuro(r.max) + ' € de péage ' + (on ? 'possible' : 'évités'));
      else statsBits.push(pdfTollAmountText(r) + ' de péage ' + (on ? 'estimé' : 'évités'));
    }
  }
  if(statsBits.length) pdfChipRow(doc, ctx, statsBits, marginLeft, contentWidth);
  doc.y += 14;

  // ---- Jours : badge rond numéroté + ligne de jonction façon "timeline" du site, contenu décalé
  // à côté des badges (contentX). Le badge du jour de retour utilise l'orange (comme la couleur
  // "final" du badge sur le site) plutôt que le teal des jours normaux. ----
  const contentX = marginLeft + 28;
  const contentWidth2 = contentWidth - 28;
  let prevBadgeCY = null;
  // Un seul rappel de vignette par pays sur tout le PDF (voir plus bas) — même logique que
  // shownVignetteCountries côté web (public/js/app.js, renderDays).
  const shownVignetteCountries = {};
  const legs = Array.isArray(trip.legs) ? trip.legs : [];
  // Avertissements valables pour tout le trajet (van, voiture électrique) : textes traduits du navigateur, sinon français.
  const PDF_NOTICES = {
    'van.notice': 'Van : hauteur, longueur, poids et vignettes antipollution peuvent limiter l\'accès à certaines routes, tunnels, cols ou centres-villes. Vérifiez avant de partir.',
    'charge.dataNote': 'Bornes de recharge : données Open Charge Map, couverture inégale selon les pays — vérifiez leur disponibilité et leur compatibilité avant de partir.',
    'days.overMaxPerCity': "Certaines villes comptent plus de jours que votre maximum par ville : il n'y a pas assez de villes-étapes possibles pour la durée de ce séjour."
  };
  const noticeTexts = (texts.notices && typeof texts.notices === 'object' && !Array.isArray(texts.notices)) ? texts.notices : {};
  // Clés connues, sans doublon (audit du 17/09/2026 : 9 800 fois la même clé bloquaient le serveur plus d'une seconde).
  Array.from(new Set((Array.isArray(trip.notices) ? trip.notices : []).filter(function(key){ return typeof key === 'string' && PDF_NOTICES.hasOwnProperty(key); }))).forEach(function(key){
    pdfBullet(doc, ctx, pdfClientText(noticeTexts[key], PDF_NOTICES[key]), marginLeft, contentWidth, { color: PDF_ACCENT_3 });
  });
  // Liens d'hébergement dans une autre devise que celle choisie (11e audit, texte du navigateur seulement).
  if(typeof texts.currencyNote === 'string' && texts.currencyNote.trim()){
    pdfBullet(doc, ctx, clip(texts.currencyNote, 240), marginLeft, contentWidth, { color: PDF_ACCENT_3 });
  }
  // Zones à tension (France Diplomatie) : départ, puis chaque étape — en tête, en gras, lien vers la fiche pays.
  let tensionShown = false;
  const departureTension = pdfTension(trip.departureTension);
  if(departureTension){
    tensionShown = true;
    pdfBullet(doc, ctx, pdfClientText(texts.departureTension, pdfTensionText(departureTension, true)), marginLeft, contentWidth, { link: departureTension.source,
      color: departureTension.level === 'red' ? PDF_DANGER : PDF_ACCENT, textColor: departureTension.level === 'red' ? PDF_DANGER : PDF_ACCENT, bold: true });
    doc.y += 6;
  }
  legs.forEach(function(leg, idx){
    if(!leg || typeof leg !== 'object' || pdfTimeUp(ctx)) return;
    const lt = (leg.texts && typeof leg.texts === 'object' && !Array.isArray(leg.texts)) ? leg.texts : {};
    // Au plus PDF_MAX_BULLETS_PER_LEG puces pour cette étape, et rien au-delà du budget de temps (voir les constantes).
    let legLines = 0;
    function legBullet(text, x, width, opts){
      if(legLines++ >= PDF_MAX_BULLETS_PER_LEG || pdfTimeUp(ctx)) return;
      pdfBullet(doc, ctx, text, x, width, opts);
    }
    const pageBefore = doc.page;
    pdfEnsureSpace(doc, 74);
    const pageChanged = doc.page !== pageBefore;
    const dayTop = doc.y;
    const badgeCX = pdfX(doc, ctx, marginLeft + 9, 0), badgeCY = dayTop + 9;
    const isReturn = !!leg.isReturn;

    if(prevBadgeCY != null && !pageChanged){
      doc.lineWidth(1.3).moveTo(badgeCX, prevBadgeCY + 9).lineTo(badgeCX, badgeCY - 9).stroke(PDF_LINE_STRONG);
    }
    doc.circle(badgeCX, badgeCY, 9).fill(isReturn ? PDF_ACCENT : PDF_ACCENT_3);
    // Libellé de l'écran (leg.badge, voir pdfClientBadge), sinon « R » ou le numéro. Réduit pour tenir dans le rond
    // (« 12–14 », chiffres d'autres écritures) : 9 pt, jusqu'à 5 pt.
    const clientBadge = pdfClientBadge(leg.badge);
    const badgeText = clientBadge || (isReturn ? 'R' : String(idx + 1));
    const badgeLang = clientBadge ? lang : 'fr';
    let badgeSize = 9;
    if(clientBadge){
      const bw = PdfText.textWidth(doc, badgeText, { lang: badgeLang, size: 9, bold: true });
      if(bw > 16) badgeSize = Math.max(5, 9 * 16 / bw);
    }
    PdfText.drawText(doc, badgeText, { x: badgeCX - 11, y: badgeCY - badgeSize * 0.72, width: 22, lang: badgeLang, size: badgeSize,
      bold: true, color: '#FFFFFF', align: 'center', maxLines: 1 });
    prevBadgeCY = badgeCY;

    doc.y = dayTop;
    pdfText(doc, ctx, clip(leg.label, 120), contentX, contentWidth2, { size: 12.5, bold: true, color: PDF_ACCENT_3 });
    if(leg.distanceKm != null && leg.travelTime){
      const routeWord = leg.ferryInfo ? ' de traversée · ' : ' de route · ';
      // Étape avec traversée : partie par la route jusqu'au port et depuis le port d'arrivée, avant la traversée.
      const roadKm = Math.round(Number(leg.roadKm));
      const roadPart = leg.ferryInfo && roadKm > 0 && roadKm < 100000 && leg.roadTime ? '~ ' + clip(leg.roadTime, 20) + ' de route · ' + pdfDistText(Number(leg.roadKm), unit) + ' + ' : '';
      const km = Number(leg.distanceKm);
      pdfText(doc, ctx, pdfClientText(lt.route, roadPart + '~ ' + clip(leg.travelTime, 20) + routeWord + (isFinite(km) ? pdfDist(km, unit) : '') + ' ' + unit, 160),
        contentX, contentWidth2, { size: 9, color: PDF_INK_SOFT });
    }
    const stopLabel = (isReturn ? 'Retour vers ' : 'Étape mystère : ') + clip(leg.stop, 100) +
      (leg.cpBadge ? ' (' + clip(leg.cpBadge, 20) + ')' : '');
    pdfText(doc, ctx, pdfClientText(lt.stop, stopLabel, 160), contentX, contentWidth2, { size: 10.5, bold: true, color: PDF_INK });
    doc.y += 4;
    const legTension = isReturn ? null : pdfTension(leg.tension);
    if(legTension){
      tensionShown = true;
      const tensionColor = legTension.level === 'red' ? PDF_DANGER : PDF_ACCENT;
      pdfBullet(doc, ctx, pdfClientText(lt.tension, pdfTensionText(legTension, false)), contentX, contentWidth2, { link: legTension.source, color: tensionColor, textColor: tensionColor, bold: true });
    }

    // Trajet au-delà de la distance max entre étapes, imposé par l'éloignement minimum (voir overMaxLeg dans
    // lib/trip-engine.js). Nombres seulement, bornés ; texte du navigateur sinon français.
    if(leg.overMaxLeg && typeof leg.overMaxLeg === 'object'){
      const maxKm = Math.round(Number(leg.overMaxLeg.max)), minKm = Math.round(Number(leg.overMaxLeg.min));
      // Bornes du moteur (distance max 5 à 3 000 km, éloignement 3 000 km au plus) : une valeur hors bornes (requête
      // forgée) n'affiche rien.
      if(maxKm >= 5 && maxKm <= 3000 && minKm >= 1 && minKm <= 3000) legBullet(pdfClientText(lt.overMaxLeg, "Trajet plus long que votre distance maximale entre étapes (" + pdfDistText(maxKm, unit) + ") : c'est l'éloignement minimum demandé (" + pdfDistText(minKm, unit) + ") qui l'impose."),
        contentX, contentWidth2, { color: PDF_ACCENT, textColor: PDF_ACCENT });
    }
    if(leg.tollInfo){
      const t = leg.tollInfo;
      // Fourchette (11e passe) : mêmes phrases que l'écran en français (toll.estimated / estimatedRange / possibleUpTo et
      // leurs variantes « option sans péage », public/js/i18n.js).
      const r = pdfTollRange(t), on = !!t.enabled;
      let tollTxt;
      if(r.kind === 'upTo'){
        tollTxt = on ? "Péage possible : jusqu'à ~" + pdfEuro(r.max) + " € selon l'itinéraire (des autoroutes gratuites longent ce trajet)."
          : "Option sans péage : sections à péage évitées (jusqu'à ~" + pdfEuro(r.max) + " € selon l'itinéraire ; des autoroutes gratuites longent aussi ce trajet).";
      } else if(r.kind === 'range'){
        tollTxt = on ? 'Péage estimé : ' + pdfTollAmountText(r) + " selon l'itinéraire."
          : 'Option sans péage : sections à péage évitées (' + pdfTollAmountText(r) + " selon l'itinéraire).";
      } else {
        tollTxt = on ? 'Péage estimé : ' + pdfTollAmountText(r) + '.' : 'Option sans péage : sections à péage évitées (' + pdfTollAmountText(r) + ').';
      }
      tollTxt += ' Estimation au kilomètre : le montant réel dépend des sections réellement empruntées.';
      // Barème des pays concernés : codes vérifiés contre TOLL_SOURCE, jamais de texte venu du client.
      const tollSources = (Array.isArray(t.countries) ? t.countries : []).slice(0, 5)
        .map(c => Object.prototype.hasOwnProperty.call(TripDataTollSource, c) ? TripDataTollSource[c] : null)
        .filter((x, i, a) => x && a.indexOf(x) === i);
      legBullet(pdfClientText(lt.toll, tollTxt + (tollSources.length ? ' Barème : ' + tollSources.join(' + ') + '.' : '')), contentX, contentWidth2);
    }
    if(leg.chargeInfo && typeof leg.chargeInfo === 'object'){
      const c = Object.assign({}, leg.chargeInfo, { stops: Math.min(Math.max(Math.round(Number(leg.chargeInfo.stops)) || 0, 0), 99),
        minutes: Math.min(Math.max(Math.round(Number(leg.chargeInfo.minutes)) || 0, 0), 9999) });
      if(c.stops > 0 && c.real && Array.isArray(c.stations)){
        const places = c.stations.slice(0, 10).map(function(s){ return clip((s && s.near) || '', 60); }).filter(Boolean).join(', ');
        legBullet(pdfClientText(lt.charge, c.stops + ' pause' + (c.stops > 1 ? 's' : '') + ' recharge (~' + Math.round(c.minutes) + ' min au total) sur ' +
          (c.stops > 1 ? 'des bornes réelles' : 'une borne réelle') + (places ? ' : ' + places : '') + '.', 800), contentX, contentWidth2);
      } else if(c.stops > 0){
        legBullet(pdfClientText(lt.charge, c.stops + ' pause' + (c.stops > 1 ? 's' : '') + ' recharge estimée' + (c.stops > 1 ? 's' : '') +
          ' (~' + Math.round(c.minutes) + ' min au total) sur borne rapide.'), contentX, contentWidth2);
      }
      if(c.noChargerNearArrival){
        legBullet(pdfClientText(lt.noCharger, 'Aucune borne publique connue à moins de ' + pdfDistText(20, unit) + ' de l\'arrivée : prévoyez de recharger à l\'hébergement.'), contentX, contentWidth2, { color: PDF_ACCENT_3 });
      }
    }
    if(Array.isArray(leg.restrictions)){
      const RESTRICTION_TEXT = {
        'van.lez': 'Zone à faibles émissions — {name} : accès selon la norme antipollution de votre véhicule.',
        'van.ztl': 'Zone à trafic limité — {name} : accès interdit aux non-résidents, verbalisation automatique.',
        'van.tunnel': '{name} : limite de hauteur, de longueur ou de poids.',
        'van.pass': '{name} : col ou route de montagne restreint aux véhicules longs.',
        'van.road': '{name} : route restreinte ou interdite aux grands véhicules.',
        'moto.noMotorway': '{name} : autoroutes interdites aux motos, trajet estimé par les routes secondaires.',
        'moto.noMotorwayCc': '{name} : autoroutes interdites aux motos de moins de {cc} cm³, vérifiez selon votre moto.',
        'moto.partial': '{name} : certaines autoroutes ou voies rapides sont interdites aux motos, vérifiez votre itinéraire.',
        'moto.cityBan': '{name} : circulation des motos interdite ou restreinte.'
      };
      const restrictionTexts = Array.isArray(lt.restrictions) ? lt.restrictions : [];
      leg.restrictions.slice(0, 12).forEach(function(r, ri){
        if(!r) return;
        const tpl = RESTRICTION_TEXT[String(r.kind) + '.' + String(r.type)];
        if(!tpl) return;
        // Remplacement par fonction : dans une chaîne de remplacement, « $' », « $& »… venus du client étaient interprétés.
        const name = clip(r.name || '', 80), cc = String(Number(r.minCc) || '');
        const text = tpl.replace('{name}', function(){ return name; }).replace('{cc}', function(){ return cc; });
        legBullet(pdfClientText(restrictionTexts[ri], text), contentX, contentWidth2, { link: pdfLink(r.source), color: PDF_ACCENT_3 });
      });
    }
    if(leg.ferryInfo){
      const f = leg.ferryInfo;
      // Textes de secours de la 11e passe (12e audit du 19/09/2026), mêmes phrases que l'écran en français (ferryLabel,
      // ferryPriceText, ferryText de public/js/app.js) : train-auto (mode 'train'), ce que couvre le tarif (priceCovers,
      // tarif piéton footAmount), durée « environ » quand elle n'est pas publiée (durationEstimated). La durée n'est
      // écrite que si le navigateur envoie durationH (heures, nombre borné) ; priceCovers absent ou inconnu : montant seul.
      const ferryLabel = f.mode === 'train' ? 'Train-auto' : 'Traversée en ferry';
      const route = clip(f.route || '', 60);
      const durH = Number(f.durationH);
      let dur = '';
      if(typeof f.durationH === 'number' && durH > 0 && durH < 100){
        const totalMin = Math.round(durH * 60), h = Math.floor(totalMin / 60), m = totalMin % 60;
        dur = (h ? h + ' h' : '') + (h && m ? ' ' : '') + (m || !h ? m + ' min' : '');
        if(f.durationEstimated === true) dur = 'environ ' + dur;
      }
      const amount = typeof f.amount === 'number' && isFinite(f.amount) && f.amount >= 0 && f.amount < 100000 ? f.amount : null;
      let ferryTxt = ferryLabel + (route ? ' — ' + route : '');
      if(amount !== null){
        const a = '~' + pdfEuro(amount) + ' €';
        const footN = Number(f.footAmount);
        const foot = typeof f.footAmount === 'number' && footN > 0 && footN < 100000 ? '~' + pdfEuro(footN) + ' €' : null;
        let price;
        if(amount === 0) price = 'gratuit';
        else if(f.priceCovers === 'vehicle') price = foot ? a + ' pour le véhicule, + ' + foot + ' par personne' : a + ' pour le véhicule, passagers en plus';
        else if(f.priceCovers === 'vehicleAndDriver') price = foot ? a + ' véhicule et conducteur, + ' + foot + ' par passager' : a + ' véhicule et conducteur, autres passagers en plus';
        else if(f.priceCovers === 'vehicleAndOccupants') price = a + ', occupants compris';
        else price = a;
        ferryTxt += ' — ' + price + (dur ? ' · ' + dur + ' de traversée' : '') + '.';
      } else {
        // Liaison réelle sans tarif fixe publié (voir priceStatus dans lib/trip-engine.js).
        ferryTxt += (dur ? ' · ' + dur + ' de traversée' : '') + '. ' + (f.priceStatus === 'variable'
          ? 'Tarif variable, vérifiez avant votre voyage.' : 'Tarif non communiqué, renseignez-vous avant votre trajet.');
      }
      legBullet(pdfClientText(lt.ferry, ferryTxt), contentX, contentWidth2);
    }
    // Rappel vignette : une seule fois par pays sur tout le PDF, comme côté web (voir
    // shownVignetteCountries plus haut).
    // Rappels NOMMÉS envoyés par le navigateur (11e audit : pays de départ, pays traversés, pays d'arrivée), un par pays :
    // seul le CODE pays du client est retenu, vérifié contre VIGNETTE_URLS — le lien est toujours celui du serveur.
    // Aucun rappel (ni nommé, ni de repli) pour un mode sans péage (vélo, voir noVignette plus haut).
    const clientVignettes = !noVignette && Array.isArray(lt.vignettes) ? lt.vignettes.slice(0, 8) : [];
    clientVignettes.forEach(function(v){
      const cc = v && typeof v.country === 'string' ? v.country : '';
      if(!Object.prototype.hasOwnProperty.call(VIGNETTE_URLS, cc) || shownVignetteCountries[cc]) return;
      shownVignetteCountries[cc] = true;
      legBullet(pdfClientText(v.text, 'Vignette autoroutière obligatoire (' + cc + ') — pensez à la commander avant de partir.', 200),
        contentX, contentWidth2, { link: VIGNETTE_URLS[cc], color: PDF_ACCENT_3 });
    });
    const vignetteUrl = !noVignette && leg.country && Object.prototype.hasOwnProperty.call(VIGNETTE_URLS, leg.country) && VIGNETTE_URLS[leg.country];
    if(vignetteUrl && !shownVignetteCountries[leg.country]){
      shownVignetteCountries[leg.country] = true;
      legBullet(pdfClientText(texts.vignette, 'Vignette autoroutière obligatoire dans ce pays — pensez à la commander avant de partir.'),
        contentX, contentWidth2, { link: vignetteUrl, color: PDF_ACCENT_3 });
    }
    const activities = Array.isArray(leg.activities) ? leg.activities : [];
    activities.slice(0, 6).forEach(function(act){
      if(!act || !act.label) return;
      const text = clip(act.label, 140) + (act.typeLabel ? ' — ' + clip(act.typeLabel, 80) : '') +
        (act.source ? ' (' + pdfClientText(act.sourceLabel, 'Source : ' + clip(act.source, 30), 60) + ')' : '');
      const link = pdfLink(act.hikeUrl);
      legBullet(text, contentX, contentWidth2, { link: link, color: link ? PDF_ACCENT_3 : PDF_ACCENT_2 });
    });
    if(leg.lodgingLinks && leg.checkInLabel){
      // checkInLabel peut être une seule date ("20 août") ou une plage ("20 août → 22 août") pour
      // un séjour de plusieurs nuits au même endroit — une seule recherche pour tout le séjour,
      // pas une par nuit (voir buildTripExportPayload côté client).
      const links = leg.lodgingLinks;
      const lodgingLabel = pdfClientText(lt.lodging, 'Logement · ' + clip(leg.checkInLabel, 40), 120);
      // Forme analysée des liens (voir pdfLink), jamais la chaîne reçue.
      const airbnbLink = pdfLink(links.airbnb), bookingLink = pdfLink(links.booking);
      if(airbnbLink) legBullet(lodgingLabel + ' — Airbnb', contentX, contentWidth2, { link: airbnbLink });
      if(bookingLink) legBullet(lodgingLabel + ' — Booking.com', contentX, contentWidth2, { link: bookingLink });
      // Plateformes locales (pays où Airbnb ou Booking.com est absent ou faible).
      // Liens hors des hôtes attendus (voir pdfLink) : ligne omise, pas seulement le lien.
      const localLinks = (Array.isArray(links.local) ? links.local.slice(0, 4) : [])
        .map(p => p ? { name: p.name, link: pdfLink(p.url) } : null).filter(p => p && p.link);
      localLinks.forEach(function(p){
        legBullet(lodgingLabel + ' — ' + clip(p.name || '', 40), contentX, contentWidth2, { link: p.link });
      });
      if(!airbnbLink && !bookingLink && !localLinks.length){
        legBullet(pdfClientText(texts.lodgingNone, 'Aucune plateforme de réservation en ligne connue ici : contactez directement les hébergements ou l\'office du tourisme.'), contentX, contentWidth2);
      }
    }
    if(isReturn){
      pdfBullet(doc, ctx, pdfClientText(texts.endMission, 'Fin de mission — retour à la maison, road trip mystère bouclé.'), contentX, contentWidth2, { color: PDF_ACCENT });
    }
    doc.y += 10;
  });

  // ---- Sac à préparer : puces remplacées par des cases à cocher, comme sur le site ----
  const packing = Array.isArray(trip.packing) ? trip.packing : [];
  if(packing.length){
    pdfEnsureSpace(doc, 60);
    doc.lineWidth(1).moveTo(marginLeft, doc.y).lineTo(marginLeft + contentWidth, doc.y).stroke(PDF_LINE);
    doc.y += 8;
    pdfText(doc, ctx, pdfClientText(texts.packTitle, 'Sac à préparer', 80), marginLeft, contentWidth, { size: 13, bold: true, color: PDF_ACCENT });
    pdfText(doc, ctx, pdfClientText(texts.packSub, 'Pour ' + clip(trip.transportLabel, 60) + ', budget ' + clip(trip.budgetLabel, 40) + '.', 160),
      marginLeft, contentWidth, { size: 9.5, color: PDF_INK_SOFT });
    doc.y += 6;
    packing.slice(0, 60).forEach(function(item){
      if(pdfTimeUp(ctx)) return;
      pdfBullet(doc, ctx, clip(item, 120), marginLeft + 4, contentWidth - 4, { checkbox: true });
    });
  }

  // Document tronqué faute de temps : signalé au lecteur plutôt que de laisser croire à un itinéraire complet.
  // pdfTimeUp d'abord (10e audit du 18/09/2026) : si le budget s'est épuisé pendant le dernier paragraphe, rien n'avait
  // encore posé ctx.truncated — la mention manquait et le pied de page (sources, attribution OSM) disparaissait.
  pdfTimeUp(ctx);
  if(ctx.truncated){
    ctx.deadline = 0; // la mention elle-même s'écrit toujours
    pdfBullet(doc, ctx, pdfClientText(texts.truncated, 'Document tronqué : cet itinéraire contient trop de texte pour être mis en page en entier.', 200),
      marginLeft, contentWidth, { color: PDF_ACCENT, textColor: PDF_ACCENT });
  }
  doc.y += 12;
  pdfEnsureSpace(doc, 30);
  doc.lineWidth(1).moveTo(marginLeft, doc.y).lineTo(marginLeft + contentWidth, doc.y).stroke(PDF_LINE);
  doc.y += 5;
  // Sources : noms propres, identiques dans toutes les langues ; phrase et date dans la langue du document
  // (modèle 'pdf.generated' avec {date} et {sources}, sinon français).
  const sources = 'IGN/geo.api.gouv.fr · GeoNames · OpenStreetMap (ODbL) · Wikipedia · Visorando · Open Charge Map' +
    (tensionShown ? ' · France Diplomatie (diplomatie.gouv.fr)' : '');
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  // Tronqué D'ABORD, repères vérifiés ensuite : l'inverse pouvait couper « {sources} » d'un modèle hostile et faire
  // disparaître la ligne d'attribution (OpenStreetMap, Wikipédia…).
  const generatedClipped = typeof texts.generated === 'string' ? clip(texts.generated, 300) : '';
  const generatedTpl = generatedClipped.includes('{date}') && generatedClipped.includes('{sources}') ? generatedClipped : null;
  const generatedDate = pdfClientText(texts.generatedDate, today, 40);
  const footer = generatedTpl
    ? generatedTpl.replace('{date}', function(){ return generatedDate; }).replace('{sources}', function(){ return sources; }) // voir {name} plus haut
    : 'Généré le ' + today + " par Cap sur l'inconnu — sources : " + sources + '.';
  pdfText(doc, ctx, footer, marginLeft, contentWidth, { size: 7.5, color: PDF_INK_SOFT });
}

// Un seul export à la fois (audit du 17/09/2026) : un export maximal coûte ~1 s de CPU ; les suivants reçoivent 503
// {error:'busy'} au lieu de s'empiler. Pris APRÈS la lecture du corps (un envoi volontairement lent ne le bloque pas) et
// libéré dès que le document est calculé (res.locals.releasePdfSlot, voir la route) — sinon à la fin ou à l'abandon de
// la réponse, au plus tard après PDF_SLOT_MAX_MS.
// 9e audit du 18/09/2026 : le créneau n'était rendu qu'à la fin de l'ENVOI. Un client qui ne lisait jamais sa réponse
// (PDF d'environ 1 Mo, tampon réseau plein) le gardait 5 s, et recommençait : les autres visiteurs recevaient « busy »
// environ 50 s par minute. Or le calcul — la seule chose que ce créneau protège — est fini au retour de doc.end().
const PDF_SLOT_MAX_MS = 5000;
let pdfExportInProgress = false;
function pdfExportSlot(req, res, next){
  if(pdfExportInProgress) return sendBusy(res, 2);
  pdfExportInProgress = true;
  let released = false;
  const timer = setTimeout(release, PDF_SLOT_MAX_MS);
  function release(){ if(!released){ released = true; clearTimeout(timer); pdfExportInProgress = false; } }
  res.on('finish', release);
  res.on('close', release);
  res.locals.releasePdfSlot = release;
  next();
}
// 32 ko (3e audit du 17/09/2026) : un export réel pèse 5 à 12 Ko (jusqu'à ~25 Ko pour 21 jours dans une écriture non
// latine) ; 128 ko laissaient place à un corps forgé dont la seule mise en page bloquait le process ~20 s.
// Retire récursivement les propriétés « toString » et « valueOf » d'un corps JSON (10e audit du 18/09/2026) : un objet
// {"toString":1} fait lever String(), Number() ou une conversion en clé de propriété — 11 champs de l'export PDF
// livraient ainsi un document coupé net, sans la mention « document tronqué » ni les sources. Un export réel n'en
// contient jamais ; le corps est borné à 32 Ko (profondeur comprise).
// Profondeur d'imbrication d'un corps JSON au-delà de laquelle il est refusé (13e audit du 19/09/2026) : stripConversionTraps
// et distinctChars s'arrêtent à 64 niveaux ; un « toString » placé plus profond (70 tableaux imbriqués dans
// tollInfo.amountMax) faisait lever Number() en pleine mise en page — PDF livré coupé, sans pied de page ni mention
// « document tronqué ». Aucun export légitime ne dépasse une dizaine de niveaux.
const BODY_MAX_DEPTH = 64;
function depthExceeds(v, max, depth){
  if(!v || typeof v !== 'object') return false;
  if(depth > max) return true;
  for(const k of Object.keys(v)) if(depthExceeds(v[k], max, depth + 1)) return true;
  return false;
}
function stripConversionTraps(v, depth){
  if(!v || typeof v !== 'object' || depth > 64) return;
  if(Object.prototype.hasOwnProperty.call(v, 'toString')) delete v.toString;
  if(Object.prototype.hasOwnProperty.call(v, 'valueOf')) delete v.valueOf;
  for(const k of Object.keys(v)) stripConversionTraps(v[k], depth + 1);
}
// Nombre de glyphes DISTINCTS que demanderaient les chaînes d'un corps JSON (au plus limit + 1 comptés).
// 12e audit du 19/09/2026, deux corrections :
// - comptés sur le texte normalisé NFC, celui que drawText met réellement en page (lib/pdf-text.js) : des syllabes
//   coréennes envoyées en jamos décomposés passaient la limite (3 967 caractères bruts distincts, 6 076 après NFC) ;
// - un caractère que la police à variante grasse séparée sait dessiner (latin, grec, cyrillique… voir
//   PdfText.hasBoldVariant) compte deux fois, une par police incorporée : il peut être écrit en gras et en maigre.
function distinctChars(v, set, limit, depth){
  if(set.size > limit || depth > 64) return set;
  if(typeof v === 'string'){
    for(const ch of v.normalize('NFC')){
      if(set.has(ch)) continue;
      set.add(ch);
      if(PdfText.hasBoldVariant(ch)) set.add('gras|' + ch);
      if(set.size > limit) break;
    }
  }
  else if(v && typeof v === 'object'){ for(const k of Object.keys(v)) distinctChars(v[k], set, limit, depth + 1); }
  return set;
}
// Au plus PDF_MAX_DISTINCT_CHARS caractères distincts par export (11e audit du 19/09/2026) : l'incorporation des polices
// (doc.end, hors du budget de mise en page) coûte selon le nombre de glyphes distincts — 10 000 idéogrammes distincts
// gelaient le process plusieurs secondes après la fin du budget. Un itinéraire réel de 21 jours en chinois en compte
// environ 1 500.
const PDF_MAX_DISTINCT_CHARS = 4000;
const PDF_GLYPH_CACHE_MAX = 6000; // par police, voir PdfText.trimGlyphCaches
// Erreur de l'export PDF réduite à son TYPE et à son code (13e audit du 19/09/2026) : le message était journalisé, or
// un message d'erreur peut reprendre un extrait des données traitées (texte envoyé par le navigateur), alors que la
// politique de confidentialité affirme que l'export PDF n'est « ni enregistré, ni journalisé ». Nom de constructeur et
// code système seulement, filtrés, jamais le message ni la pile.
function pdfErrorKind(err){
  const name = err && typeof err.name === 'string' && /^[A-Za-z]{1,40}$/.test(err.name) ? err.name : 'Erreur';
  const code = err && typeof err.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(err.code) ? err.code : '';
  return name + (code ? ' (' + code + ')' : '');
}
app.post('/api/export-pdf', cpuBudgetGuard, express.json({ limit: '32kb' }), cpuBudgetGuard, pdfExportSlot, (req, res) => {
  // Polices du PDF illisibles (fichiers absents, dossier non déployé) : service indisponible, 503 et non 500 (12e audit du
  // 19/09/2026) — l'échec ne dépend pas de la requête. Détail (code d'erreur seul) dans le journal et /api/status.
  try { PdfText.loadFonts(); } catch(err){
    console.warn('[export-pdf] polices indisponibles :', (err && err.code) || 'erreur');
    res.setHeader('Retry-After', '60');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'pdf fonts unavailable' });
  }
  if(depthExceeds(req.body, BODY_MAX_DEPTH, 0)) return res.status(400).json({ error: 'invalid trip data' });
  stripConversionTraps(req.body, 0);
  if(distinctChars(req.body, new Set(), PDF_MAX_DISTINCT_CHARS, 0).size > PDF_MAX_DISTINCT_CHARS){
    return res.status(413).json({ error: 'too many distinct characters' });
  }
  const trip = req.body;
  if(!trip || typeof trip !== 'object' || !Array.isArray(trip.legs) || trip.legs.length === 0 || trip.legs.length > 25){
    return res.status(400).json({ error: 'invalid trip data' });
  }
  // Chaînes seulement (un objet profond faisait échouer String() hors du try ci-dessous : erreur 500).
  trip.tripLabel = typeof trip.tripLabel === 'string' ? trip.tripLabel : '';
  trip.city = typeof trip.city === 'string' ? trip.city : '';
  // Demi-caractères retirés (emoji coupé par clip, ou envoyé tel quel) : encodeURIComponent les refuse (erreur 500).
  // toWellFormed : l'ancienne regex laissait passer deux demi-caractères bas consécutifs (« \udc00\udc00 » : erreur 500).
  const filenameBase = clip(trip.tripLabel || trip.city || 'itineraire', 60).toWellFormed().replace(/\uFFFD/g, '')
    .replace(/[\\/:*?"<>|]+/g, '-') || 'itineraire';
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 55, right: 55 },
    info: { Title: "Cap sur l'inconnu - " + filenameBase },
    lang: typeof trip.lang === 'string' && PDF_LANGS.has(trip.lang) ? trip.lang : 'fr'
  });
  PdfText.registerFonts(doc);
  res.setHeader('Content-Type', 'application/pdf');
  // RFC 5987 : encodeURIComponent laisse ' ( ) * ! non encodés, que les analyseurs stricts refusent (« l'Ain ») — 11e audit.
  const rfc5987 = encodeURIComponent(filenameBase).replace(/['()*!]/g, function(c){ return '%' + c.charCodeAt(0).toString(16).toUpperCase(); });
  res.setHeader('Content-Disposition', "attachment; filename=\"itineraire.pdf\"; filename*=UTF-8''" + rfc5987 + '.pdf');
  doc.pipe(res);
  // Mise en page ET compression des pages sont synchrones dans pdfkit (doc.end() compris) : leur durée compte dans le
  // budget de calcul global.
  const t0 = performance.now();
  try {
    buildTripPdf(doc, trip);
  } catch(err){
    console.warn('[export-pdf] erreur de mise en page :', pdfErrorKind(err));
  }
  // doc.end() dans un try lui aussi (13e audit) : une erreur levée ici partait vers le gestionnaire d'erreurs, en-têtes
  // déjà envoyés, puis vers celui d'Express, qui journalise la pile complète (message compris).
  try { doc.end(); } catch(err){
    console.warn('[export-pdf] erreur de finalisation :', pdfErrorKind(err));
    res.destroy();
  }
  PdfText.trimGlyphCaches(PDF_GLYPH_CACHE_MAX);
  cpuBudgetCharge(req, performance.now() - t0);
  // Calcul terminé (pdfkit est synchrone jusqu'à doc.end() compris) : il ne reste que l'envoi, qui ne coûte pas de
  // calcul. Le créneau est rendu tout de suite (voir pdfExportSlot).
  if(res.locals.releasePdfSlot) res.locals.releasePdfSlot();
  // Filet de sécurité : document jamais terminé (incorporation d'une police ou annotation restée ouverte après une erreur
  // interne de pdfkit) — la connexion est coupée au lieu de rester pendante indéfiniment.
  const endGuard = setTimeout(function(){
    if(!res.writableEnded){
      console.warn('[export-pdf] document non terminé après 15 s : connexion coupée');
      res.destroy();
    }
  }, 15000);
  endGuard.unref();
  res.on('close', function(){ clearTimeout(endGuard); });
});

// BUNDLES DE DONNÉES (communes-bundle.txt, aliases-bundle.txt) : concaténation de tous les fichiers communes-XX.txt
// (resp. aliases-XX.txt), écrite par scripts/build-data-bundles.js au déploiement (écriture atomique, texte brut
// seulement : plus aucune version .txt.gz/.txt.br, les anciennes sont effacées). Ils ne sont plus servis au navigateur
// (voir plus bas) : le serveur les lit seulement pour initialiser le moteur, plus vite que ~90 fichiers séparés.
// Format : chaque fichier précédé d'un marqueur `###XX###` sur sa propre ligne (XX = code pays en MAJUSCULES ; la
// France, `communes.txt`, porte le code `FR`), puis son contenu tel quel — voir buildBundleTextAsync, qui reproduit ce
// format quand le bundle est absent ou périmé.
// Compression : aucune pour ces données (lues sur le disque, jamais envoyées). Seuls quelques gros fichiers statiques
// du navigateur sont compressés, une fois, en mémoire après le démarrage du moteur (voir PRECOMPRESSED_FILES).
const DATA_DIR = path.join(__dirname, 'public', 'data');
// Routes /data/communes-bundle.txt et /data/aliases-bundle.txt RETIRÉES (audit de septembre 2026) : plus utilisées par
// le navigateur, elles gardaient en mémoire 226 Mo de texte (plus les versions compressées) dès la première requête
// et envoyaient 226 Mo à tout client sans compression. /data/ répond désormais 404 (voir « SÉCURITÉ » en tête).
//
// lib/trip-engine.js — voir son commentaire d'en-tête pour le détail complet. Initialisé UNE
// SEULE FOIS ici, juste après le démarrage du process (donc avant qu'aucun trafic réel ne puisse
// arriver dans la même tâche) plutôt qu'au premier /api/search-city ou /api/generate-trip reçu :
// le tout premier visiteur après un redémarrage n'a ainsi jamais à attendre ce calcul.
// DÉMARRAGE (septembre 2026) — le serveur ne dépend plus de l'étape de construction de « Run NPM Install »,
// constatée comme non exécutée (ou en échec) sur l'hébergement mutualisé : bundles précompilés absents, index de
// recherche absent, et à chaque démarrage une recompression inutile de ~190 Mo avant même de charger le moteur.
// 1. Le moteur reçoit le TEXTE BRUT des lieux : bundle précompilé s'il est plus récent que tous les fichiers de
//    données, sinon simple concaténation des fichiers — jamais de compression ici.
// 2. Index de recherche sur disque (lib/search-index.js) : utilisé s'il est à jour ; sinon, construit par un
//    processus enfant AVANT le chargement du moteur (pour ne pas additionner les deux pics de mémoire), puis
//    conservé dans cache/ pour les démarrages suivants. Un verrou évite deux constructions simultanées si
//    l'hébergeur lance plusieurs processus. En cas d'échec, le moteur assure la recherche en mémoire.
// 3. GET /api/status expose l'état (index, construction, moteur) pour diagnostiquer l'hébergement à distance.
const SEARCH_INDEX_DIR = path.join(__dirname, 'cache', 'search-index');
const SEARCH_INDEX_LOCK = path.join(__dirname, 'cache', 'search-index.lock');
const startupStatus = { startedAt: new Date().toISOString(), searchIndex: 'absent', build: null, engine: 'en attente', engineSteps: null };
let diskSearchIndex = null;

// Concaténation des fichiers de données quand le bundle précompilé est absent ou périmé — jamais de variante Sync de
// fs ici (un calcul synchrone de cette taille gèlerait le process). Le format ###XX###/franceCode doit rester
// synchronisé avec scripts/build-data-bundles.js.
function buildBundleTextAsync(re, franceCode){
  var files = fs.readdirSync(DATA_DIR).filter(function(f){ return re.test(f); }); // liste de noms seule, quasi instantané
  return Promise.all(files.map(function(f){
    return fs.promises.readFile(path.join(DATA_DIR, f), 'utf8').then(function(content){
      var m = f.match(re);
      var cc = (m[1] ? m[1].toUpperCase() : franceCode);
      return '###' + cc + '###\n' + content;
    });
  })).then(function(parts){ return parts.join('\n'); });
}
function loadRawBundleText(name, re, franceCode){
  var bundlePath = path.join(DATA_DIR, name + '.txt');
  return fs.promises.readdir(DATA_DIR).then(function(files){
    var sources = files.filter(function(f){ return re.test(f); });
    return Promise.all(sources.map(function(f){ return fs.promises.stat(path.join(DATA_DIR, f)); })).then(function(stats){
      var newestSource = stats.reduce(function(m, st){ return Math.max(m, st.mtimeMs); }, 0);
      return fs.promises.stat(bundlePath).then(function(st){
        return st.mtimeMs >= newestSource ? fs.promises.readFile(bundlePath, 'utf8') : buildBundleTextAsync(re, franceCode);
      }, function(){ return buildBundleTextAsync(re, franceCode); });
    });
  });
}

function openDiskSearchIndex(){
  try {
    diskSearchIndex = searchIndex.open(SEARCH_INDEX_DIR, DATA_DIR, tripEngine.internals);
  } catch(err){
    diskSearchIndex = null;
    startupStatus.searchIndexError = err.message;
    // Index présent mais incohérent (tailles vérifiées depuis le 7e audit) : dit dans le journal, puis reconstruit.
    console.warn('[search-index] index sur disque refusé :', err.message);
  }
  startupStatus.searchIndex = diskSearchIndex ? 'disque (' + diskSearchIndex.entries + ' entrées)' : 'absent ou périmé';
  return diskSearchIndex;
}

// Verrou de construction encore vivant : présent, rafraîchi depuis moins de 30 minutes (battement de cœur) et dont au
// moins un des PID inscrits existe encore. Un verrou vide tout juste créé (moins de 5 s) compte comme vivant.
function searchIndexLockAlive(){
  var age, pids;
  try {
    age = Date.now() - fs.statSync(SEARCH_INDEX_LOCK).mtimeMs;
    pids = fs.readFileSync(SEARCH_INDEX_LOCK, 'utf8').split('\n').map(function(l){ return parseInt(l, 10); }).filter(function(p){ return p > 0; });
  } catch(e){ return false; }
  if(age >= 30 * 60 * 1000) return false;
  if(!pids.length) return age < 5000;
  return pids.some(function(pid){ try { process.kill(pid, 0); return true; } catch(e){ return false; } }); // EPERM : processus d'un autre compte (hébergement mutualisé), jamais le nôtre — 11e audit
}
// PID inscrit en première ligne du verrou de construction (NaN si absent ou illisible).
function lockOwnerPid(){
  try { return parseInt(fs.readFileSync(SEARCH_INDEX_LOCK, 'utf8').split('\n')[0], 10); } catch(e){ return NaN; }
}
// Rafraîchit la date du verrou s'il est bien le nôtre (battement de cœur, voir buildSearchIndexInChild).
function touchOwnLock(){
  try { if(lockOwnerPid() === process.pid){ var now = new Date(); fs.utimesSync(SEARCH_INDEX_LOCK, now, now); } } catch(e){}
}

function buildSearchIndexInChild(){
  return new Promise(function(resolve){
    fs.mkdirSync(path.dirname(SEARCH_INDEX_LOCK), { recursive: true });
    // Verrou partagé avec scripts/build-search-index.js, pris par création EXCLUSIVE (flag 'wx', atomique) : deux
    // processus démarrés ensemble ne peuvent plus construire tous les deux (vérification puis écriture séparées avant le
    // 17/09/2026). Contrat avec le script : le serveur écrit SON PID, lance l'enfant (qui reconnaît le PID de son parent
    // et travaille sous ce verrou sans le recréer ni le retirer), puis retire le verrou à la fin de l'enfant.
    // Verrou existant : vivant (PID vivant, moins de 30 min) -> on attend la fin de l'autre construction ; orphelin
    // (processus disparu, verrou trop ancien ou illisible) -> supprimé, puis une seule nouvelle tentative.
    var acquired = false;
    for(var attempt = 0; attempt < 2 && !acquired; attempt++){
      try {
        fs.writeFileSync(SEARCH_INDEX_LOCK, String(process.pid), { flag: 'wx' });
        acquired = true;
      } catch(e){
        if(e.code !== 'EEXIST') throw e;
        var lockAge = Infinity, lockPid = NaN, lockAlive = false, lockPids = [], lockRaw = null;
        try {
          lockAge = Date.now() - fs.statSync(SEARCH_INDEX_LOCK).mtimeMs;
          // Deux lignes depuis le 7e audit : PID du serveur, puis PID de l'enfant qui construit (voir plus bas).
          lockRaw = fs.readFileSync(SEARCH_INDEX_LOCK, 'utf8');
          lockPids = lockRaw.split('\n').map(function(l){ return parseInt(l, 10); });
          lockPid = lockPids[0];
        } catch(e2){ if(e2.code === 'ENOENT') continue; } // retiré entre-temps : nouvelle tentative
        lockPids.forEach(function(pid){
          if(!(pid > 0) || lockAlive) return;
          try { process.kill(pid, 0); lockAlive = true; } catch(e3){ lockAlive = false; } // EPERM : un autre compte, jamais notre construction (11e audit)
        });
        if(!(lockPid > 0) && lockAge < 5000) lockAlive = true; // verrou vide tout juste créé (PID pas encore écrit) : pas un orphelin
        if(lockAge < 30 * 60 * 1000 && lockAlive){
          startupStatus.build = 'construction en cours dans un autre processus';
          var waited = 0;
          // Attente jusqu'au retrait du verrou, ou jusqu'à ce qu'il ne soit plus vivant (9e audit du 18/09/2026) : si le
          // serveur et l'enfant qu'il désigne meurent tous deux sans le retirer, on attendait jusqu'à 30 minutes sans
          // moteur ni recherche (le moteur n'est lancé qu'après cette attente).
          var timer = setInterval(function(){
            waited += 10;
            if(!searchIndexLockAlive() || waited > 30 * 60){
              clearInterval(timer);
              var opened = !!openDiskSearchIndex();
              // État de /api/status mis à jour (constaté en production le 18/09/2026 : il restait « construction en
              // cours dans un autre processus » alors que l'index construit par l'autre processus était chargé).
              startupStatus.build = opened ? 'construite par un autre processus' : 'attente terminée, index indisponible';
              resolve(opened);
            }
          }, 10000);
          return;
        }
        // Orphelin : renommé (atomique) avant suppression — un simple rmSync pouvait effacer le verrou qu'un autre
        // processus venait de prendre entre la vérification et la suppression.
        if(attempt === 0){
          var staleLock = SEARCH_INDEX_LOCK + '.stale-' + process.pid;
          try {
            fs.renameSync(SEARCH_INDEX_LOCK, staleLock);
            // Pris entre-temps par un autre processus (contenu différent de celui examiné) : remis en place.
            // Comparaison du contenu BRUT (10e audit du 18/09/2026) : avec les PID, un verrou illisible (« abc ») donnait
            // NaN !== NaN, était remis en place à chaque démarrage et ne pouvait plus jamais être repris.
            if(fs.readFileSync(staleLock, 'utf8') !== lockRaw){ try { fs.linkSync(staleLock, SEARCH_INDEX_LOCK); } catch(e5){} }
            fs.rmSync(staleLock, { force: true });
          } catch(e4){ if(e4.code !== 'ENOENT') throw e4; }
        }
      }
    }
    if(!acquired) throw new Error('verrou ' + SEARCH_INDEX_LOCK + ' impossible à prendre');
    startupStatus.build = 'construction en cours (démarrée le ' + new Date().toISOString() + ')';
    console.log('[search-index] index absent ou périmé : construction en arrière-plan…');
    var t0 = Date.now(), output = '';
    var child = require('child_process').spawn(process.execPath, ['--max-old-space-size=1024', path.join(__dirname, 'scripts', 'build-search-index.js')], { cwd: __dirname });
    // PID de l'enfant ajouté au verrou (7e audit) : si le serveur meurt en cours de construction, le verrou ne portait
    // plus qu'un PID mort et un autre démarrage le jugeait orphelin — deux constructions simultanées dans le même
    // dossier. La 1re ligne reste le PID du serveur (contrat avec scripts/build-search-index.js, qui la compare à son ppid).
    if(child.pid){ try { fs.writeFileSync(SEARCH_INDEX_LOCK, process.pid + '\n' + child.pid); } catch(e){} }
    // Battement de cœur (8e audit, 18/09/2026) : la date du verrou n'était posée qu'une fois, à sa création. Or tout
    // verrou de plus de 30 minutes était jugé orphelin MÊME si son processus vivait encore — une construction longue
    // (hébergement mutualisé lent) voyait donc un second serveur lancer une seconde construction dans le même dossier,
    // les deux s'effaçant mutuellement. La date est désormais rafraîchie chaque minute tant que l'enfant travaille (et
    // par l'enfant lui-même à chaque pays, voir scripts/build-search-index.js) : « plus de 30 minutes » veut dire
    // « plus de 30 minutes sans signe de vie », ce que le seuil voulait dire dès le départ.
    var heartbeat = setInterval(function(){ touchOwnLock(); }, 60000);
    heartbeat.unref();
    function collect(chunk){ output = (output + chunk.toString()).slice(-2000); }
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', function(err){ collect('erreur de lancement : ' + err.message); });
    child.on('close', function(code, signal){
      clearInterval(heartbeat);
      // Retiré seulement s'il porte encore NOTRE PID en première ligne : sinon on supprimait le verrou d'un autre
      // processus qui l'aurait repris entre-temps (8e audit).
      try { if(lockOwnerPid() === process.pid) fs.unlinkSync(SEARCH_INDEX_LOCK); } catch(e){}
      var ok = code === 0 && !!openDiskSearchIndex();
      startupStatus.build = (ok ? 'réussie' : 'ÉCHEC') + ' en ' + Math.round((Date.now() - t0) / 1000) + ' s'; // détail : journal du serveur
      console.log('[search-index] ' + startupStatus.build + ' (code ' + code + (signal ? ', signal ' + signal : '') + ') — ' + output.trim().split('\n').slice(-3).join(' | '));
      resolve(ok);
    });
  });
}

function startEngine(){
  startupStatus.engine = 'chargement';
  var t0 = Date.now();
  var needAliases = !diskSearchIndex;
  return Promise.all([
    loadRawBundleText('communes-bundle', /^communes(?:-([a-z]{2}))?\.txt$/, 'FR'),
    needAliases ? loadRawBundleText('aliases-bundle', /^aliases-([a-z]{2})\.txt$/, '') : Promise.resolve(''),
    fs.promises.readFile(path.join(DATA_DIR, 'featured.txt'), 'utf8')
  ]).then(function(results){
    return tripEngine.init(results[0], results[1], results[2], { skipSearchIndex: !needAliases });
  }).then(function(){
    // Bornes de recharge Open Charge Map (scripts/fetch-charging-stations.js) : sans ce fichier, la voiture électrique
    // retombe sur l'estimation par l'autonomie seule, signalée sur chaque étape.
    return fs.promises.readFile(path.join(__dirname, 'data', 'charging-stations.txt'), 'utf8').then(function(raw){
      var n = tripEngine.loadChargingStations(raw);
      startupStatus.chargers = n;
      console.log('[trip-engine] ' + n + ' bornes de recharge chargées.');
    }, function(err){
      startupStatus.chargers = 0;
      console.warn('[trip-engine] bornes de recharge indisponibles (' + err.code + ') : estimation par autonomie seule.');
    });
  }).then(function(){
    startupStatus.engine = 'prêt en ' + Math.round((Date.now() - t0) / 1000) + ' s';
    console.log('[trip-engine] prêt en ' + (Date.now() - t0) + ' ms.');
  }).catch(function(err){
    startupStatus.engine = 'ÉCHEC'; // détail : journal du serveur
    console.error('[trip-engine] échec d\'initialisation, /api/search-city et /api/generate-trip resteront indisponibles :', err.message);
  });
}

// engineStartup : résolue quand le moteur est prêt (ou en échec) — la précompression des fichiers statiques attend ce
// moment pour ne pas lui disputer le CPU (voir PRECOMPRESSED_FILES).
let engineStartup;
if(openDiskSearchIndex()){
  console.log('[search-index] index sur disque utilisé (' + diskSearchIndex.entries + ' entrées, ' + diskSearchIndex.places + ' lieux).');
  engineStartup = startEngine();
} else {
  // Échec de la construction (dossier cache/ non inscriptible…) : le moteur démarre quand même, recherche en mémoire.
  engineStartup = buildSearchIndexInChild().catch(function(err){ console.error('[search-index] construction impossible :', err.message); }).then(startEngine);
}

app.get('/api/status', function(req, res){
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    startedAt: startupStatus.startedAt,
    uptimeS: Math.round(process.uptime()),
    searchIndex: startupStatus.searchIndex,
    searchIndexError: startupStatus.searchIndexError ? true : null, // détail dans le journal du serveur seulement
    build: startupStatus.build,
    engine: startupStatus.engine,
    searchReady: !!diskSearchIndex || tripEngine.isSearchReady(),
    tripsReady: tripEngine.isReady(),
    chargers: startupStatus.chargers || 0,
    precompressed: startupStatus.precompressed || null,
    pdfFonts: startupStatus.pdfFonts || null,
    // Grille terre/mer : « indisponible » signifie qu'aucune traversée maritime n'est détectée (7e audit) — une
    // information à connaître de l'extérieur, le contrôle échouant alors en silence.
    landGrid: landGrid.status(),
    // Grille des voies à péage (OpenStreetMap) : « indisponible » signifie qu'aucun péage n'est estimé.
    tollGrid: tollGrid.status()
  });
});

// Recherches de plus de SEARCH_BUDGET_MIN_MS comptées dans le budget de calcul global et celui de l'IP (les recherches
// ordinaires, de quelques ms, n'y pèsent pas). Les DEUX budgets peuvent refuser une recherche (3e audit du 17/09/2026) :
// une recherche à froid lit l'index sur disque de façon synchrone et coûte jusqu'à ~1 s, de quoi tenir le process
// occupé en continu à quelques adresses si seul le budget par IP s'appliquait.
const SEARCH_BUDGET_MIN_MS = 50;
// Cache des résultats de recherche (10e audit du 18/09/2026) : une recherche courte et fréquente (« san » avec le pays
// US, « sant » avec FR) coûte jusqu'à 1 s ; une trentaine d'appels venus d'adresses différentes suffisaient à épuiser
// le budget de calcul global. L'index ne change pas pendant la vie du process : une réponse déjà calculée est rendue
// telle quelle, sans calcul. 5 000 entrées au plus (quelques Mo), les plus anciennes sortent d'abord.
// Limite assumée du budget global : le moteur est synchrone et tient ~3 Go en mémoire — le dupliquer dans des workers
// pour isoler les calculs n'est pas possible sur l'hébergement mutualisé. Quelques adresses IP qui enchaînent des
// tirages lourds (≈ 4 s chacun) peuvent donc encore occuper le process ; les quotas par IP en fixent le nombre minimal.
const SEARCH_CACHE_MAX = 5000;
const searchCache = new Map();
app.get('/api/search-city', cpuBudgetGuard, function(req, res){
  var q = String(req.query.q || '');
  if(!q || q.length > 120){
    return res.status(400).json({ error: 'invalid query', results: [] });
  }
  if(!diskSearchIndex && !tripEngine.isSearchReady()){
    return res.status(503).json({ error: 'not ready', results: [] });
  }
  var t0 = performance.now();
  // Imputation au budget juste après le calcul (11e audit du 19/09/2026) : elle se faisait à l'envoi de la réponse
  // ('finish'), qui n'a jamais lieu quand le client coupe la connexion — 40 recherches abandonnées d'une même adresse
  // tournaient sans jamais être comptées. Voir chargeSearch plus bas.
  function chargeSearch(){ var ms = performance.now() - t0; if(ms > SEARCH_BUDGET_MIN_MS) cpuBudgetCharge(req, ms); }
  try {
    var limitRaw = parseInt(req.query.limit, 10);
    var limit = (isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 20) ? limitRaw : 8;
    // Pays prioritaire (celui de la langue d'interface) : ses lieux passent avant tous les autres, triés entre eux
    // par population comme le reste.
    var country = /^[A-Z]{2}$/.test(String(req.query.country || '')) ? String(req.query.country) : '';
    // lang : langue d'interface, pour choisir le nom alternatif affiché entre parenthèses.
    var lang = /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(String(req.query.lang || '')) ? String(req.query.lang) : '';
    var cacheKey = (diskSearchIndex ? 'd|' : 'm|') + q.trim().toLowerCase() + '|' + limit + '|' + country + '|' + lang;
    var results = searchCache.get(cacheKey);
    if(results){
      searchCache.delete(cacheKey); searchCache.set(cacheKey, results); // récemment utilisée : en fin de file
    } else {
      results = diskSearchIndex ? diskSearchIndex.search(q, limit, country, lang) : tripEngine.searchCity(q, limit, country, lang);
      chargeSearch();
      searchCache.set(cacheKey, results);
      if(searchCache.size > SEARCH_CACHE_MAX) searchCache.delete(searchCache.keys().next().value);
    }
    res.json({ results: results });
  } catch(err){
    console.warn('[search-city] erreur:', JSON.stringify(String(err && err.message)));
    res.status(500).json({ error: 'internal error', results: [] });
  }
});

// Tirage synchrone : le moteur borne lui-même sa durée (réponse `timedOut: true`, étapes vides, relayée telle quelle au
// client) ; le budget global (cpuBudgetGuard) borne la somme des tirages de tous les visiteurs.
app.post('/api/generate-trip', cpuBudgetGuard, express.json({ limit: '16kb' }), cpuBudgetGuard, function(req, res){
  if(!tripEngine.isReady()){
    return res.status(503).json({ error: 'not ready' });
  }
  const t0 = performance.now();
  try {
    const trip = tripEngine.generateTrip(req.body);
    cpuBudgetCharge(req, performance.now() - t0);
    res.json(trip);
  } catch(err){
    cpuBudgetCharge(req, performance.now() - t0);
    // Toute erreur ici vient soit d'une entrée invalide (voir la validation en tête de
    // generateTrip), soit d'un cas limite du moteur (ex. aucune commune atteignable) — jamais
    // d'une panne interne à cacher : 400 dans les deux cas, avec le message tel quel (déjà en
    // français, déjà écrit pour être compréhensible, voir lib/trip-engine.js).
    // Les erreurs de programmation (TypeError, RangeError… sur une entrée mal formée) ne sont pas renvoyées telles quelles.
    const known = err && err.constructor === Error;
    res.status(400).json({ error: known ? err.message : 'requête invalide' });
  }
});

// Routes /api inconnues : 404 JSON court plutôt que la page HTML d'Express (placé après toutes les routes /api).
app.use('/api', function(req, res){
  res.status(404).json({ error: 'not found' });
});

// PRÉCOMPRESSION DES GROS FICHIERS STATIQUES (audit du 17/09/2026) — i18n.js (11 Mo) coûtait ~0,85 s de CPU par réponse
// en compression à la volée. Compressés UNE fois au démarrage, en tâche de fond asynchrone et l'un après l'autre (pas de
// contention avec le chargement du moteur, voir plus haut l'essai en parallèle mesuré plus lent), puis servis depuis la
// mémoire selon Accept-Encoding. Lancée une fois le moteur prêt : mesuré en local (machine chargée), 70 s pendant son
// chargement contre 15 s une fois le moteur prêt. Brotli qualité 9 : ~1,4 s pour i18n.js (751 Ko) contre ~14 s en qualité 11 (662 Ko).
// Tant que la précompression n'est pas prête (ou si le fichier a changé sur le disque depuis), comportement habituel
// (express.static + compression à la volée). Mêmes en-têtes qu'express.static : ETag faible taille-date (identique d'une
// voie à l'autre, donc 304 cohérents), Last-Modified, Cache-Control no-cache/must-revalidate, plus Vary: Accept-Encoding.
const PRECOMPRESSED_FILES = {
  '/js/i18n.js': 'application/javascript; charset=UTF-8',
  '/js/trip-data.js': 'application/javascript; charset=UTF-8',
  '/js/app.js': 'application/javascript; charset=UTF-8',
  '/css/style.css': 'text/css; charset=UTF-8'
};
const precompressed = new Map(); // chemin d'URL -> { size, mtimeMs, etag, lastModified, br, gzip }
function staticEtag(stat){
  return 'W/"' + stat.size.toString(16) + '-' + stat.mtime.getTime().toString(16) + '"';
}
async function precompressStaticFiles(){
  const t0 = Date.now();
  const util = require('util');
  const brotli = util.promisify(zlib.brotliCompress), gzip = util.promisify(zlib.gzip);
  for(const urlPath of Object.keys(PRECOMPRESSED_FILES)){
    const filePath = path.join(__dirname, 'public', urlPath);
    try {
      const stat = await fs.promises.stat(filePath);
      const raw = await fs.promises.readFile(filePath);
      const br = await brotli(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } });
      const gz = await gzip(raw, { level: 9 });
      precompressed.set(urlPath, { size: stat.size, mtimeMs: stat.mtimeMs, etag: staticEtag(stat), lastModified: stat.mtime.toUTCString(), br: br, gzip: gz });
    } catch(err){
      console.warn('[précompression] ' + urlPath + ' ignoré :', err.message);
    }
  }
  startupStatus.precompressed = precompressed.size + ' fichier(s) en ' + Math.round((Date.now() - t0) / 100) / 10 + ' s';
  console.log('[précompression] ' + startupStatus.precompressed);
}
engineStartup.then(precompressStaticFiles).catch(function(err){ console.warn('[précompression] échec :', err.message); })
  .then(function(){
    // Polices du PDF (26 Mo de fichiers, ~140 Mo en mémoire une fois les tables OpenType analysées) lues une fois au
    // démarrage : sinon le premier export (≈ 3 s) était imputé au budget de calcul du visiteur, qui recevait ensuite un 429.
    const t0 = Date.now();
    try {
      PdfText.warmUp();
      startupStatus.pdfFonts = 'prêtes en ' + Math.round((Date.now() - t0) / 100) / 10 + ' s';
    } catch(err){
      // Code d'erreur seul (12e audit du 19/09/2026), comme landGrid / tollGrid : le message contenait le chemin absolu
      // du fichier manquant, exposé à tous par /api/status. Message complet : journal du serveur seulement.
      startupStatus.pdfFonts = 'ÉCHEC (' + ((err && err.code) || 'erreur') + ')';
      console.warn('[pdf] polices :', err.message);
    }
  });
// Quota de débit des GROS fichiers statiques (3e audit du 17/09/2026) : `/js/i18n.js` fait 11 Mo non compressé et le
// limiteur ne couvrait que /api/ — un client refusant la compression (Accept-Encoding: identity) pouvait en tirer
// autant de fois qu'il voulait. 30 requêtes par minute et par IP sur ces fichiers, bien au-delà d'un usage réel (le
// navigateur les met en cache et les revalide).
const BIG_STATIC_RE = /^\/(js\/(i18n|trip-data|app)\.js|css\/style\.css)$/;
const bigStaticHits = new Map();
setInterval(function(){
  const now = Date.now();
  for(const [ip, hits] of bigStaticHits){ if(!hits.length || now - hits[hits.length - 1] > 60000) bigStaticHits.delete(ip); }
}, 60000).unref();
// Test sur le chemin DÉCODÉ et normalisé, sans tenir compte de la casse (9e audit du 18/09/2026) : « /js/%6918n.js »,
// « /js//i18n.js » ou « /css/../js/i18n.js » échappaient au quota, puis express.static les servait quand même.
app.use(function(req, res, next){
  if(!BIG_STATIC_RE.test((req.normPath || req.path).toLowerCase())) return next();
  const ip = req.ip || 'inconnu';
  const now = Date.now();
  let hits = bigStaticHits.get(ip);
  if(!hits){ hits = []; bigStaticHits.set(ip, hits); }
  while(hits.length && now - hits[0] > 60000) hits.shift();
  if(hits.length >= 30){
    res.setHeader('Retry-After', '60');
    return res.status(429).type('text/plain').send('Too many requests');
  }
  hits.push(now);
  // Revalidation (304, aucun octet de contenu) : décomptée (11e audit du 19/09/2026) — chaque chargement de page comptait
  // 4 fichiers même en 304, et au 8e chargement dans la minute i18n.js répondait 429 : le site ne marchait plus, plus
  // vite encore derrière une adresse partagée (entreprise, école, opérateur mobile).
  res.on('finish', function(){
    if(res.statusCode !== 304) return;
    const i = hits.lastIndexOf(now);
    if(i >= 0) hits.splice(i, 1);
  });
  next();
});

app.use(function(req, res, next){
  if(req.method !== 'GET' && req.method !== 'HEAD') return next();
  // Variante d'écriture d'un fichier précompressé (« /js/%6918n.js ») : redirigée vers son chemin normal plutôt que
  // recompressée à la volée par express.static (~1 s de calcul par réponse de 11 Mo, 9e audit du 18/09/2026).
  if(req.normPath && req.normPath !== req.path && Object.prototype.hasOwnProperty.call(PRECOMPRESSED_FILES, req.normPath)){
    return res.redirect(301, req.normPath);
  }
  const entry = Object.prototype.hasOwnProperty.call(PRECOMPRESSED_FILES, req.path) ? precompressed.get(req.path) : null;
  if(!entry) return next();
  // Brotli d'abord dès qu'il est accepté : les navigateurs envoient « gzip, deflate, br », et la négociation par ordre
  // choisissait gzip (3,3 Mo au lieu de 750 Ko pour i18n.js).
  const encoding = req.acceptsEncodings('br') === 'br' ? 'br' : (req.acceptsEncodings('gzip') === 'gzip' ? 'gzip' : null);
  if(!encoding) return next(); // client sans compression : express.static
  // Fichier modifié sur le disque depuis la précompression (mise à jour sans redémarrage) : version du disque.
  fs.stat(path.join(__dirname, 'public', req.path), function(err, stat){
    if(err || stat.size !== entry.size || stat.mtimeMs !== entry.mtimeMs){
      precompressed.delete(req.path);
      return next();
    }
    res.locals.precompressed = true;
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('ETag', entry.etag);
    res.setHeader('Last-Modified', entry.lastModified);
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Content-Type', PRECOMPRESSED_FILES[req.path]);
    if(req.fresh) return res.status(304).end();
    const body = entry[encoding];
    res.setHeader('Content-Encoding', encoding);
    res.setHeader('Content-Length', body.length);
    if(req.method === 'HEAD') return res.end();
    res.end(body);
  });
});

app.use(express.static(path.join(__dirname, 'public'), {
  // Les données (communes.txt, communes-XX.txt, featured.txt) sont volumineuses mais
  // Le HTML/CSS/JS change à chaque mise à jour de l'app : un cache d'1h dessus faisait qu'un simple rechargement de page
  // pouvait continuer à servir une ancienne version sans même revalider auprès du serveur. Revalidation systématique
  // pour TOUT ce qui est servi ici — l'exception d'un cache long pour /data/ n'a plus lieu d'être, ce dossier répondant
  // 404 depuis l'audit de septembre 2026 (voir « SÉCURITÉ » en tête).
  extensions: ['html'],
  setHeaders: function(res){
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
}));

// Chemin inconnu hors /api (12e audit du 19/09/2026) : 404 texte court, comme /data. Sans ce gestionnaire, Express
// servait sa page HTML « Cannot GET … », contrairement à ce qu'annonçait le commentaire ci-dessous. Les routes /api
// inconnues ont leur propre 404 JSON (plus haut).
app.use(function(req, res){
  res.status(404).type('text/plain').send('Not found');
});

// Toute erreur non traitée (JSON invalide, URL mal encodée…) : réponse courte, jamais la page d'erreur d'Express.
app.use(function(err, req, res, next){
  // Export PDF (13e audit du 19/09/2026) : type d'erreur seulement, jamais le message (voir pdfErrorKind) — y compris en-têtes
  // déjà envoyés, où next(err) laisserait Express journaliser la pile complète.
  const isPdfExport = /^\/api\/export-pdf\/?$/i.test(req.path); // routage insensible à la casse
  if(res.headersSent){
    if(!isPdfExport) return next(err);
    console.error('[erreur]', req.method, JSON.stringify(req.path), pdfErrorKind(err));
    return res.destroy();
  }
  const status = err && err.status >= 400 && err.status < 500 ? err.status : 500;
  if(status === 500) console.error('[erreur]', req.method, JSON.stringify(req.path), isPdfExport ? pdfErrorKind(err) : JSON.stringify(String(err && err.message)));
  res.status(status).json({ error: status === 500 ? 'internal error' : 'bad request' });
});

const httpServer = app.listen(PORT, () => {
  console.log(`Cap sur l'Inconnu — http://localhost:${PORT}`);
});
// Connexions lentes (10e audit du 18/09/2026) : une connexion ouverte sans envoyer un octet n'était jamais fermée, un
// corps envoyé au compte-gouttes tenait plus de 5 minutes. En-têtes : 15 s ; requête complète (corps compris) : 30 s ;
// socket inactif (aucun octet dans un sens ni dans l'autre) : 2 minutes — bien au-delà du plus long calcul (~5 s) et des
// appels sortants attendus en file (20 s d'attente au plus, voir OUTBOUND_GROUPS). Limite connue (12e audit du
// 19/09/2026) : le pire enchaînement de /api/photo (122 s, voir OUTBOUND_MAX_HOLD_MS) ne produit aucun octet pendant
// son calcul et peut dépasser ces 2 minutes — la connexion est alors coupée, la place rendue à la fin réelle de l'appel.
httpServer.headersTimeout = 15000;
httpServer.requestTimeout = 30000;
httpServer.setTimeout(120000, function(socket){ socket.destroy(); });
// Port déjà pris, droits insuffisants… : sans écouteur 'error', Node relançait l'exception plus loin, sans message clair
// (7e audit). Le process s'arrête, l'hébergeur (Passenger) le relance.
httpServer.on('error', function(err){
  console.error('[serveur] écoute impossible sur le port ' + PORT + ' :', err.code || err.message);
  process.exit(1);
});
// Arrêt demandé par l'hébergeur (redémarrage cPanel, déploiement) : les réponses en cours vont au bout, puis le process
// s'arrête. Sans cela, Passenger coupait les connexions ouvertes (export PDF de plusieurs secondes perdu).
let shuttingDown = false;
['SIGTERM', 'SIGINT'].forEach(function(sig){
  process.on(sig, function(){
    if(shuttingDown) return process.exit(0);
    shuttingDown = true;
    console.log('[serveur] ' + sig + ' : arrêt en cours…');
    httpServer.close(function(){ process.exit(0); });
    setTimeout(function(){ process.exit(0); }, 10000).unref(); // filet : connexions gardées ouvertes
  });
});
// Une promesse rejetée sans catch termine le process sous Node 20+ : le serveur repartait de zéro (~40 s de chargement)
// pour une simple erreur d'appel sortant. Journalisée, sans arrêt.
process.on('unhandledRejection', function(reason){
  console.error('[promesse non traitée]', reason && reason.stack ? reason.stack : String(reason));
});
// Exception non rattrapée : l'état du process n'est plus sûr, on journalise puis on laisse l'hébergeur relancer.
process.on('uncaughtException', function(err){
  console.error('[exception non rattrapée]', err && err.stack ? err.stack : String(err));
  process.exit(1);
});
