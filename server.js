// Serveur minimal : sert le dossier public/ tel quel (HTML, CSS, JS, données), plus deux routes
// API — une qui va chercher une vraie photo sur Wikipédia, une qui va chercher de vrais points
// d'intérêt sur OpenStreetMap (voir plus bas). Aucune donnée du visiteur n'est reçue ni conservée ;
// le seul état en mémoire est le cache de ces deux routes.
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const express = require('express');
const compression = require('compression');
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
// Requête lancée depuis une page d'un AUTRE site (en-tête posé par le navigateur, qu'une page ne peut pas modifier).
// Comparaison insensible à la casse et blancs coupés : la valeur d'un en-tête n'est pas normalisée par Node, et un
// client qui vise le contournement choisit son écriture. Un client qui n'envoie pas l'en-tête n'est jamais concerné.
function estCrossSite(req){ return String(req.get('Sec-Fetch-Site') || '').trim().toLowerCase() === 'cross-site'; }
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
  // Comparaison INSENSIBLE À LA CASSE et blancs coupés (17e audit du 20/09/2026) : la valeur d'un en-tête HTTP n'est
  // pas normalisée par Node, « Cross-Site » ou « cross-site » (avec une espace de tête) passaient à travers alors que
  // la RFC 6265bis/Fetch les décrit comme le même jeton. Les navigateurs écrivent bien « cross-site » en minuscules,
  // mais un client qui vise le contournement, lui, choisit son écriture.
  if(estCrossSite(req)) return res.status(403).json({ error: 'cross-site request' });
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
// Export PDF : le travail se fait dans un FIL, qui ne bloque pas la boucle d'événements de ce processus (19e audit
// du 21/09/2026). Deux durées, deux budgets : l'adresse demandeuse paie tout ce qui a été calculé pour elle (`ms`),
// le budget GLOBAL du site ne reçoit que ce que le processus a réellement passé à travailler (`msProcessus`, non nul
// seulement en repli). Auparavant, un fil qui ne répondait plus imputait jusqu'à 15 000 ms au budget global —
// 60 % des 25 000 ms par minute de tout le site — pour un export qui n'avait bloqué personne.
function cpuBudgetChargeExport(req, ms, msProcessus){
  if(ms > 0) cpuBudgetIpAdd(cpuBudgetIpOf(req), ms);
  if(msProcessus > 0) cpuBudgetAdd(msProcessus);
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
// `max` : plafond PROPRE à ce cache (17e audit du 20/09/2026) — une entrée bien plus lourde que les autres (les
// relations OpenStreetMap d'osmHikeCache) ne doit pas se compter en milliers comme une réponse photo de quelques
// centaines d'octets.
function cacheSet(map, key, value, max){
  if(map.has(key)) map.delete(key);
  map.set(key, value);
  const limit = max || CACHE_MAX_ENTRIES;
  while(map.size > limit) map.delete(map.keys().next().value);
}
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// Clé de cache normalisée (forme Unicode, espaces) : « Ajaccio », « ajaccio » et « Ajaccio␠» ne font plus
// trois appels ni trois entrées.
// 16e audit du 20/09/2026 : la clé n'est PLUS mise entièrement en minuscules. Le nom part tel quel vers Wikipédia, qui
// n'ignore la casse que sur la PREMIÈRE lettre d'un titre : « tHOIRY » et « Thoiry » sont deux articles différents (le
// premier n'existe pas). Le résultat VIDE de « tHOIRY » était donc resservi à « Thoiry » — 24 h pour /api/photo, 14 j
// pour /api/pois. Seule la première lettre est canonisée, exactement comme le fait Wikipédia : clé et titre coïncident
// (« ajaccio » et « Ajaccio » gardent bien une seule entrée), les autres lettres restent distinctes.
// 17e audit du 20/09/2026 : cette canonisation ne vaut QUE pour le début d'un titre Wikipédia. Le nom d'un lieu occupe
// bien le début du titre (« Thoiry », « Thoiry (Yvelines) ») : sa première lettre est donc canonisée par Wikipédia, et
// la clé doit l'être aussi. Le département/la région, lui, est écrit entre parenthèses AU MILIEU du titre, où Wikipédia
// ne canonise plus rien : hors de France, où c'est du texte libre venu des données (voir resolvePlacePhotoIn),
// « Nom (illinois) » et « Nom (Illinois) » sont deux articles DIFFÉRENTS. Leur appliquer cacheKeyPart les réunissait
// sous une seule entrée : le résultat VIDE de l'un (article inexistant) était resservi à l'autre pendant 24 h, à tous
// les visiteurs. Le département passe donc désormais par wikiDeptName (ci-dessous), qui rend exactement la chaîne
// envoyée à Wikipédia — jamais retouchée.
function cacheKeyPart(s){
  const v = String(s == null ? '' : s).normalize('NFC').trim();
  if(!v) return v;
  const first = String.fromCodePoint(v.codePointAt(0));
  return first.toUpperCase() + v.slice(first.length);
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

// Nom fait seulement de points et d'espaces (15e audit du 19/09/2026) : « .. » ou « . » passait tel quel dans le chemin
// de l'URL Wikipédia (encodeURIComponent laisse les points), et la normalisation d'URL en faisait un AUTRE chemin
// (« /page/summary/.. » -> « /page/ »). « %2E » n'y change rien : la norme URL le traite aussi comme un point dans ces
// segments. Refusés : réponse normale (sans photo, sans lieu, sans randonnée) et aucun appel sortant.
function isDotsOnlyName(name){ return /^[.\s]+$/.test(String(name || '')); }

// Titre d'un AUTRE espace de noms de Wikipédia (« File:… », « Utilisateur:X/brouillon », « Category:… », « Special:… ») :
// jamais un lieu, et modifiable par n'importe qui — fetchCommuneMonuments les refuse depuis longtemps, /api/photo les
// envoyait encore tels quels (16e audit du 20/09/2026). Préfixe de lettres suivi de « : », en tête du nom seulement :
// un vrai nom de commune ou de lieu n'en a pas.
// 17e audit du 20/09/2026 : un SOULIGNÉ en tête contournait le contrôle. MediaWiki remplace « _ » par une espace dans
// un titre puis coupe les blancs de début et de fin : « _File:X.jpg », « __Fichier:X.jpg » ou « _ Category:Foo »
// désignent exactement « File:X.jpg », « Fichier:X.jpg » et « Category:Foo ». Ils passaient et déclenchaient un appel
// sortant vers un titre d'un autre espace de noms. Le nom subit donc la même transformation avant le contrôle.
function isNamespaceTitle(name){ return /^\s*:?\s*\p{L}[\p{L}\p{M} _-]{0,32}\s*:/u.test(String(name || '').replace(/_/g, ' ').trim()); }

// null = pas d'article exploitable (404…) ; exception = échec transitoire (réseau, délai, 429, 5xx, service saturé).
function fetchWikiSummary(title, lang){
  if(isDotsOnlyName(title)) return Promise.resolve(null); // voir isDotsOnlyName
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
// Désambiguïsateur RÉELLEMENT écrit entre parenthèses dans le titre Wikipédia (« Nom (Yvelines) », « Nom (Illinois) »),
// ou null quand aucune parenthèse n'est ajoutée. En France : nom du département, tiré de DEPARTMENTS par son code
// canonisé (les clés sont en majuscules : « 2a » désigne bien la Corse-du-Sud) ; ailleurs : le nom de région, déjà en
// clair dans les données, envoyé tel quel. Une SEULE définition (17e audit du 20/09/2026), partagée avec les clés de
// cache de /api/photo et /api/pois pour qu'elles contiennent exactement ce qui part vers Wikipédia.
// hasOwnProperty : « constructor » ou « __proto__ » ne doivent pas être pris pour un département.
function wikiDeptName(deptCode, country){
  const raw = String(deptCode == null ? '' : deptCode).normalize('NFC').trim();
  if(!raw) return null;
  if(!country || country === 'FR'){
    const code = raw.toUpperCase();
    return Object.prototype.hasOwnProperty.call(DEPARTMENTS, code) ? DEPARTMENTS[code] : null;
  }
  return raw;
}
async function resolvePlacePhotoIn(name, deptCode, country, lang, near, titles, ctx){
  ctx = ctx || {};
  const deptName = wikiDeptName(deptCode, country);
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
// Nom qui désigne bien un FICHIER de Commons (16e audit du 20/09/2026). Une étiquette OpenStreetMap
// « wikimedia_commons = .. » (ou « . », ou « Category:Église de X », valeur pourtant courante) produisait une URL
// Special:FilePath que Commons résout en PAGE HTML — servie ensuite au navigateur comme si c'était une image (et
// enregistrée telle quelle dans le PDF). Même garde que isDotsOnlyName, plus le refus d'un autre espace de noms
// (« Category: », « Creator: »… ; le préfixe « File:/Fichier: » est retiré par l'appelant) et d'un nom sans extension.
function isCommonsFileName(filename){
  const f = String(filename == null ? '' : filename).trim();
  if(!f || f.length > 240) return false;
  if(isDotsOnlyName(f)) return false; // voir isDotsOnlyName : « .. » sort du chemin après normalisation d'URL
  if(f.indexOf(':') >= 0 || f.indexOf('/') >= 0) return false;
  return /\.[a-z0-9]{2,5}$/i.test(f); // un vrai nom de fichier Commons se termine par une extension
}
// null quand le nom ne désigne pas un fichier : l'appelant n'ajoute alors ni image ni lien.
function commonsFileUrl(filename){
  if(!isCommonsFileName(filename)) return null;
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(String(filename).trim());
}

// Même logique d'essais que resolvePlacePhoto : "Nom (Département)" d'abord si connu (convention
// de désambiguïsation Wikipédia), puis "Nom" seul.
// ctx.failed : échec transitoire (voir fetchWikiSummary), le résultat de /api/pois n'est alors pas mis en cache.
async function fetchCommuneMonuments(name, deptCode, lat, lon, ctx){
  ctx = ctx || {};
  const deptName = wikiDeptName(deptCode, 'FR'); // section « Lieux et monuments » : Wikipédia en français seulement
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
      const fileUrl = file ? commonsFileUrl(file) : null; // null : le nom ne désigne pas un fichier (voir commonsFileUrl)
      if(fileUrl){ entry.image = fileUrl; entry.imageFull = fileUrl; }
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
      const filename = String(commonsTag).replace(/^(file|fichier):/i, '').trim();
      // Étiquette qui ne désigne pas un fichier (« .. », « Category:… ») : ni image ni lien (16e audit du 20/09/2026,
      // voir commonsFileUrl) — l'URL produite retombait sur une page HTML servie comme image.
      const url = commonsFileUrl(filename);
      if(url){
        poi.image = url;
        poi.imageFull = url;
        poi.wikiUrl = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(filename);
      }
    }
    // Repli : le tag "wikipedia" (format "langue:Titre") pointe vers un vrai article Wikipédia
    // dédié quand il existe, même sans photo Commons associée — un lien reste préférable à aucun
    // lien du tout pour un lieu sans image trouvée.
    if(!poi.wikiUrl && el.tags.wikipedia){
      const wpMatch = String(el.tags.wikipedia).match(/^([a-z-]{2,})\s*:\s*(.+)$/i);
      if(wpMatch && !isDotsOnlyName(wpMatch[2])) poi.wikiUrl = 'https://' + wpMatch[1].toLowerCase() + '.wikipedia.org/wiki/' + encodeURIComponent(wpMatch[2].trim().replace(/ /g, '_'));
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
// Plafond PROPRE à ce cache (17e audit du 20/09/2026) : une entrée y vaut 60 relations avec leurs étiquettes, pas une
// petite réponse JSON comme dans photoCache ou poiCache. Au plafond commun de 5 000 entrées, le seul osmHikeCache
// pouvait occuper plusieurs centaines de Mo (jusqu'à quelques Go avec les étiquettes retirées ci-dessous). 400 entrées
// = 400 zones de 15 km déjà consultées, largement de quoi servir les étapes d'une même journée et les visiteurs qui se
// suivent sur les mêmes régions, pour au plus ~6 Mo (400 × 60 relations × ~250 o d'étiquettes gardées).
const OSM_HIKE_CACHE_MAX = 400;
const osmHikeCache = new Map();
const HIKE_NETWORK_RANK = { lwn: 0, rwn: 1, nwn: 2, iwn: 3 };
function parseKm(v){
  const m = String(v || '').replace(',', '.').match(/^\s*(\d+(?:\.\d+)?)\s*(km)?\s*$/i);
  return m ? parseFloat(m[1]) : null;
}
// Étiquettes RÉELLEMENT relues plus bas (17e audit du 20/09/2026) : fetchOsmHikes n'utilise que `name`,
// `name:<langue>` (le nom dans la langue du visiteur), `distance` (itinéraires de plus d'une journée écartés) et
// `network` (ordre local -> régional -> national). `sac_scale`, `osmc:symbol`, `ref`, `website`, `description` et
// `operator` étaient gardés en cache 14 jours sans jamais être relus : la randonnée renvoyée a `difficulty: null`, et
// ni le lien (Waymarked Trails, construit depuis l'identifiant) ni le texte affiché ne s'en servent. Avec 60 relations
// par entrée, ces six étiquettes coupées à 300 caractères pesaient jusqu'à ~100 ko par entrée à elles seules —
// multiplié par le plafond du cache. `description` seule (souvent plusieurs centaines de caractères en OSM) en
// représentait l'essentiel. Valeurs ramenées à 120 caractères : un nom d'itinéraire réel tient largement dedans
// (« Europäischer Fernwanderweg E5 — Abschnitt Oberstdorf–Meran » : 58), et un nom plus long serait de toute façon
// coupé à l'affichage.
const HIKE_TAG_RE = /^(name(:[a-z]{2,3})?|distance|network)$/;
const HIKE_TAG_MAX_LEN = 120;
function pickHikeTags(tags){
  const out = {};
  for(const k of Object.keys(tags)){
    if(HIKE_TAG_RE.test(k) && typeof tags[k] === 'string') out[k] = tags[k].slice(0, HIKE_TAG_MAX_LEN);
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
    // Étiquettes utiles seulement (11e audit du 19/09/2026, resserré au 17e du 20/09/2026) : le cache gardait TOUTES les
    // étiquettes de 60 relations par entrée, sur 5 000 entrées — jusqu'à quelques centaines de Mo. Gardés désormais :
    // seulement ce que fetchOsmHikes relit (voir pickHikeTags), avec un plafond d'entrées à part.
    elements = (data.elements || []).map(e => ({ id: e.id, tags: pickHikeTags(e.tags || {}), lat: e.center && e.center.lat, lon: e.center && e.center.lon }));
    cacheSet(osmHikeCache, cacheKey, { elements, ts: Date.now() }, OSM_HIKE_CACHE_MAX);
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
  // « .. », « . » : aucun appel sortant ni lien de portail (voir isDotsOnlyName, 15e audit du 19/09/2026).
  if(isDotsOnlyName(name)) return res.json({ hikes: [], portals: [] });
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
  // « .. », « . » : réponse vide, aucun appel sortant (voir isDotsOnlyName, 15e audit du 19/09/2026).
  if(isDotsOnlyName(name)) return res.json({ pois: [] });
  // Clé par nom+département plutôt que seules les coordonnées arrondies : plus fiable pour ne
  // jamais confondre deux communes proches, et cohérent avec la recherche Wikipédia (par nom).
  // 17e audit du 20/09/2026 : la clé contient EXACTEMENT ce qui part vers Wikipédia — le nom avec sa seule première
  // lettre canonisée (comme Wikipédia le fait sur ses titres, voir cacheKeyPart) et le désambiguïsateur tel qu'il sera
  // écrit entre parenthèses (voir wikiDeptName ; hors de France, fetchCommuneMonuments n'est pas tentée, le département
  // ne part nulle part et ne distingue donc plus deux entrées). MÊME condition que fetchAllRealPOIs (`!country ||
  // country === 'FR'`) : un pays VIDE vaut France et le département compte alors, sans quoi deux départements
  // partageraient une entrée.
  const cacheKey = lat.toFixed(2) + ',' + lon.toFixed(2) + '|' + cacheKeyPart(name) + '|' +
    (!country || country === 'FR' ? (wikiDeptName(dept, 'FR') || '') : '') + '|' + country;
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
  const deptRaw = String(req.query.dept || '').normalize('NFC').trim().slice(0, 40);
  // Code pays à deux lettres seulement (2e audit du 17/09/2026) : une valeur libre allongeait la clé de cache.
  const countryRaw = String(req.query.country || '').trim().toUpperCase();
  const country = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : '';
  // Code de département canonisé (16e audit du 20/09/2026) : les clés de DEPARTMENTS sont en majuscules (« 2A », « 2B »),
  // donc « 2a » ne désignait AUCUN département — l'article « Nom (Corse-du-Sud) » n'était pas tenté — alors que la clé de
  // cache, mise en minuscules, était la même que celle de « 2A ». Deux comportements pour une seule entrée : le résultat
  // vide de l'un était resservi à l'autre. Comme /api/pois (voir plus haut), la valeur est ramenée à la forme des clés.
  const deptFr = !country || country === 'FR';
  const dept = (deptFr && Object.prototype.hasOwnProperty.call(DEPARTMENTS, deptRaw.toUpperCase())) ? deptRaw.toUpperCase() : deptRaw;
  const lang = sanitizeLangCode(req.query.lang);
  if(!name || name.length > 120){
    return res.status(400).json({ error: 'invalid name' });
  }
  // « .. », « . » : pas de photo, aucun appel sortant (voir isDotsOnlyName, 15e audit du 19/09/2026).
  // « File:… », « Utilisateur:… » : idem (voir isNamespaceTitle, 16e audit du 20/09/2026).
  if(isDotsOnlyName(name) || isNamespaceTitle(name)) return res.json({ image: null, imageFull: null, wikiUrl: null, title: null });
  // Point de référence (lieu OSM, étape ou commune) et rayon selon sa précision : voir wikiPlaceMatches.
  const nLat = parseFloat(req.query.lat), nLon = parseFloat(req.query.lon);
  const kind = Object.prototype.hasOwnProperty.call(PHOTO_NEAR_KM, req.query.kind) ? req.query.kind : 'stop';
  const near = (isFinite(nLat) && isFinite(nLon) && Math.abs(nLat) <= 90 && Math.abs(nLon) <= 180)
    ? { lat: nLat, lon: nLon, km: PHOTO_NEAR_KM[kind] } : null;
  // Sans point de référence, la réponse est VIDE quoi qu'il arrive (17e audit du 20/09/2026) : wikiPlaceMatches écarte
  // tout article quand `near` est absent (voir VÉRIFICATION DES SOURCES), donc resolvePlacePhoto rend « pas de photo »
  // après avoir tout de même interrogé Wikipédia, Wikidata et Commons — des appels sortants garantis inutiles, dont le
  // résultat vide occupait ensuite une entrée de cache 24 h. Réponse immédiate, aucun appel, rien à mettre en cache.
  if(!near) return res.json({ image: null, imageFull: null, wikiUrl: null, title: null });
  // Clé normalisée (voir cacheKeyPart) : le nom envoyé à Wikipédia reste celui reçu, et la clé garde la casse — seule la
  // première lettre est canonisée, comme Wikipédia le fait sur ses titres (16e audit du 20/09/2026). Le département,
  // lui, entre dans la clé tel qu'il sera écrit entre parenthèses dans le titre (voir wikiDeptName, 17e audit du
  // 20/09/2026) : hors de France c'est du texte libre, que Wikipédia ne canonise pas.
  const cacheKey = cacheKeyPart(name) + '|' + (wikiDeptName(dept, country) || '') + '|' + country + '|' + lang + '|' + nLat.toFixed(2) + ',' + nLon.toFixed(2) + ',' + kind;
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

// Mise en page du PDF : lib/trip-pdf.js (sortie de ce fichier au 17e audit du 20/09/2026, voir son en-tête) —
// liens autorisés, textes, géométrie, budget de temps. Ce fichier ne garde que la route, la validation et les quotas.
const { clip, PDF_LANGS, PDF_BUILD_BUDGET_MS } = require('./lib/trip-pdf.js');
// Service d'export : la mise en page tourne dans un FIL DE TRAVAIL (lib/pdf-worker.js), pas ici — elle est synchrone
// et bloquait tout le serveur pendant 0,1 à 3,1 s à chaque export (17e audit du 20/09/2026). Repli dans ce processus
// si le fil manque à l'appel.
const PdfService = require('./lib/pdf-service.js');


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
      if(PdfService.hasBoldVariant(ch)) set.add('gras|' + ch);
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
// Taille maximale du corps de /api/export-pdf (17e audit du 20/09/2026). L'ancienne limite de 32 ko refusait en 413
// l'export d'un vrai voyage dans une vingtaine de langues : une écriture indienne, tibétaine, birmane, khmère ou
// singhalaise coûte 3 octets par caractère en UTF-8 (contre 1 en français), et un mot y est souvent plus long.
// MESURE (tests/server.test.js, « PDF dans les 161 langues ») sur un voyage MAXIMAL — 21 journées, 15 villes, voiture
// électrique avec pauses recharge sur bornes réelles, traversée en ferry, péage, vignette, restrictions van ET moto,
// zone à tension, randonnée et deux POI par jour, hébergement — construit avec les VRAIES traductions de
// public/js/i18n.js pour chacune des 161 langues :
//     minimum 61 094 o (ii)   médiane 69 926 o   maximum 117 947 o (dz, puis my 117 373, ta 116 189, ml 111 496).
// Limite retenue : pire cas × 2 arrondi à la puissance de deux supérieure -> 117 947 × 2 = 235 894 -> 256 ko. Marge de
// 2,2 fois le pire cas mesuré, de quoi absorber un allongement des traductions ou des noms de lieux sans nouveau 413.
// Protection contre le déni de service conservée : le corps reste borné (legs.length <= 25, PDF_MAX_DISTINCT_CHARS,
// clip() sur chaque texte à la mise en page), l'export est limité à 10 par minute et par adresse (RATE_LIMITS), un
// seul export à la fois (pdfExportSlot) et le budget de calcul global (cpuBudgetGuard) encadre l'ensemble — 256 ko
// analysés coûtent moins d'une milliseconde, sans commune mesure avec la mise en page elle-même.
// Mise en page : ce voyage MAXIMAL tient désormais EN ENTIER dans les 161 langues, sous le budget de
// PDF_BUILD_BUDGET_MS (3,5 s) — pire temps mesuré 3,1 s. Quatre écritures n'y arrivaient pas (hindi 13 villes sur 15,
// marathi 10, bengali 10, dzongkha 5) : le document était livré signé, avec la mention « document tronqué » traduite,
// mais amputé. Ce n'était pas le budget qui était trop court, c'était la mise en forme qui coûtait trop cher — voir
// memoiseLayout dans lib/pdf-text.js. Le budget n'a pas été relevé : c'est un garde-fou contre le déni de service.
const PDF_MAX_BODY = '256kb';
// Erreur de l'export PDF réduite à son TYPE et à son code (13e audit du 19/09/2026) : le message était journalisé, or
// un message d'erreur peut reprendre un extrait des données traitées (texte envoyé par le navigateur), alors que la
// politique de confidentialité affirme que l'export PDF n'est « ni enregistré, ni journalisé ». Nom de constructeur et
// code système seulement, filtrés, jamais le message ni la pile.
function pdfErrorKind(err){
  const name = err && typeof err.name === 'string' && /^[A-Za-z]{1,40}$/.test(err.name) ? err.name : 'Erreur';
  const code = err && typeof err.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(err.code) ? err.code : '';
  return name + (code ? ' (' + code + ')' : '');
}
app.post('/api/export-pdf', cpuBudgetGuard, express.json({ limit: PDF_MAX_BODY }), cpuBudgetGuard, pdfExportSlot, async (req, res) => {
  // Réponse d'erreur avant toute mise en page : le créneau d'export est rendu tout de suite (14e audit du 19/09/2026).
  // Avant, il ne l'était qu'à « finish »/« close » ou au bout de PDF_SLOT_MAX_MS : une réponse 400 mise en attente derrière
  // une grosse réponse non lue, sur une connexion enchaînée, bloquait l'export de tout le monde ~5 s (503 « busy »).
  const fail = function(code, body){
    if(res.locals.releasePdfSlot) res.locals.releasePdfSlot();
    return res.status(code).json(body);
  };
  // Polices du PDF illisibles (fichiers absents, dossier non déployé) : service indisponible, 503 et non 500 (12e audit du
  // 19/09/2026) — l'échec ne dépend pas de la requête. Détail (code d'erreur seul) dans le journal et /api/status.
  // Depuis le 17e audit, c'est le FIL DE TRAVAIL qui les lit : on ne refuse que s'il a explicitement échoué dessus.
  // Tant qu'il démarre encore, on laisse l'export suivre son cours — il attendra, ou basculera en repli.
  if(PdfService.status().fontsError){
    console.warn('[export-pdf] polices indisponibles :', PdfService.status().fontsError);
    res.setHeader('Retry-After', '60');
    res.setHeader('Cache-Control', 'no-store');
    return fail(503, { error: 'pdf fonts unavailable' });
  }
  if(depthExceeds(req.body, BODY_MAX_DEPTH, 0)) return fail(400, { error: 'invalid trip data' });
  stripConversionTraps(req.body, 0);
  if(distinctChars(req.body, new Set(), PDF_MAX_DISTINCT_CHARS, 0).size > PDF_MAX_DISTINCT_CHARS){
    return fail(413, { error: 'too many distinct characters' });
  }
  const trip = req.body;
  if(!trip || typeof trip !== 'object' || !Array.isArray(trip.legs) || trip.legs.length === 0 || trip.legs.length > 25){
    return fail(400, { error: 'invalid trip data' });
  }
  // Chaînes seulement (un objet profond faisait échouer String() hors du try ci-dessous : erreur 500).
  trip.tripLabel = typeof trip.tripLabel === 'string' ? trip.tripLabel : '';
  trip.city = typeof trip.city === 'string' ? trip.city : '';
  // Demi-caractères retirés (emoji coupé par clip, ou envoyé tel quel) : encodeURIComponent les refuse (erreur 500).
  // toWellFormed : l'ancienne regex laissait passer deux demi-caractères bas consécutifs (« \udc00\udc00 » : erreur 500).
  // 17e audit du 20/09/2026 : le libellé reçu porte maintenant des marques d'ordre BIDIRECTIONNEL invisibles
  // (isolats FSI U+2068 … PDI U+2069 posés autour de chaque nom propre par tripLabelText d'app.js) et, en écriture de
  // droite à gauche, une flèche « ← ». Un nom de fichier, lui, se lit de gauche à droite dans le gestionnaire de
  // fichiers et la liste des téléchargements : la flèche y est remise à « → » (comme le fait déjà pdfFilename côté
  // navigateur — avec les isolats du libellé, elle nomme toujours le départ en premier) et toutes les marques de
  // direction sont retirées, sans quoi elles ressortaient en « %E2%81%A8 » au milieu du nom encodé en RFC 5987, sans
  // rien afficher. L'EN-TÊTE du document, lui, garde le libellé intact (voir tripLabel dans buildTripPdf) : c'est du
  // texte mis en page, où ces marques font justement leur travail.
  const filenameBase = clip(trip.tripLabel || trip.city || 'itineraire', 60).toWellFormed().replace(/\uFFFD/g, '')
    .replace(/\u2190/g, '\u2192')
    .replace(/[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[\\/:*?"<>|]+/g, '-').trim() || 'itineraire';
  res.setHeader('Content-Type', 'application/pdf');
  // RFC 5987 : encodeURIComponent laisse ' ( ) * ! non encodés, que les analyseurs stricts refusent (« l'Ain ») — 11e audit.
  const rfc5987 = encodeURIComponent(filenameBase).replace(/['()*!]/g, function(c){ return '%' + c.charCodeAt(0).toString(16).toUpperCase(); });
  res.setHeader('Content-Disposition', "attachment; filename=\"itineraire.pdf\"; filename*=UTF-8''" + rfc5987 + '.pdf');
  // La mise en page part dans le fil de travail : la boucle d'événements de CE processus reste libre pendant ce
  // temps-là (17e audit du 20/09/2026). Le document n'est plus diffusé au fil de sa création mais envoyé d'un bloc —
  // quelques centaines de kilo-octets, sans commune mesure avec le bénéfice.
  // Demandeur parti ? Le service abandonne le travail AVANT de le calculer (18e audit du 21/09/2026) : sans cela,
  // des exports envoyés puis aussitôt abandonnés empilaient des mises en page que plus personne n'attendait —
  // c'est le cœur de la faille de déni de service corrigée ce jour-là (voir l'en-tête de lib/pdf-service.js).
  let connexionFermée = false;
  res.on('close', function(){ if(!res.writableEnded) connexionFermée = true; });
  let resultat;
  try {
    resultat = await PdfService.build({
      trip: trip,
      title: "Cap sur l'inconnu - " + filenameBase,
      lang: typeof trip.lang === 'string' && PDF_LANGS.has(trip.lang) ? trip.lang : 'fr',
      glyphMax: PDF_GLYPH_CACHE_MAX
    }, function(){ return connexionFermée; });
  } catch(err){
    // Temps déjà dépensé avant l'échec (fil expiré, fil mort en cours de route) : imputé quand même, sinon un
    // export qui échoue serait gratuit — et c'est justement le chemin qu'emprunte un abus (18e audit).
    if(err && (err.msDépensé > 0 || err.msProcessus > 0)) cpuBudgetChargeExport(req, err.msDépensé || 0, err.msProcessus || 0);
    // File pleine : le service refuse tout de suite plutôt que d'accepter un travail qu'il ne tiendra pas. Même
    // réponse que le créneau d'export déjà pris.
    if(err && err.busy) return sendBusy(res, 2);
    // Ni le fil ni le repli n'ont abouti (polices illisibles des deux côtés, mémoire) : l'échec ne dépend pas de la
    // requête, donc 503 comme pour les polices absentes.
    console.warn('[export-pdf] échec de la mise en page :', pdfErrorKind(err));
    res.setHeader('Retry-After', '60');
    res.setHeader('Cache-Control', 'no-store');
    return fail(503, { error: 'pdf unavailable' });
  }
  if(resultat.erreur) console.warn('[export-pdf] erreur de mise en page :', typeof resultat.erreur === 'string' ? resultat.erreur : pdfErrorKind(resultat.erreur));
  // Temps de calcul RÉELLEMENT dépensé (fil et repli additionnés) imputé au quota de l'adresse demandeuse ;
  // seule la part passée DANS CE PROCESSUS pèse sur le budget global (voir cpuBudgetChargeExport).
  cpuBudgetChargeExport(req, resultat.ms, resultat.msProcessus || 0);
  // Calcul terminé : il ne reste que l'envoi, qui ne coûte pas de calcul. Le créneau est rendu tout de suite.
  if(res.locals.releasePdfSlot) res.locals.releasePdfSlot();
  // Travail abandonné parce que le demandeur était parti : il n'y a plus personne à qui répondre.
  if(resultat.abandonné) return res.end();
  if(!resultat.pdf || !resultat.pdf.length){
    console.warn('[export-pdf] document vide');
    res.setHeader('Retry-After', '60');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'pdf unavailable' });
  }
  res.setHeader('Content-Length', String(resultat.pdf.length));
  res.end(resultat.pdf);
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
    // État VIVANT du fil de l'export : au 18e audit, cette ligne rendait la valeur figée au démarrage et annonçait
    // « polices prêtes » pendant que le fil était mort et que tous les exports repartaient en repli — le seul point
    // de diagnostic à distance mentait précisément quand il fallait s'en servir.
    pdfFonts: (function(){
      const e = PdfService.status();
      if(e.fontsError) return 'ÉCHEC (' + e.fontsError + ')';
      return e.statut + (e.enCours || e.enAttente ? ' · en cours ' + (e.enCours ? 1 : 0) + ', en attente ' + e.enAttente : '');
    })(),
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
// …mais le reliquat n'est plus PERDU (18e audit du 21/09/2026) : une recherche de 49 ms ne coûtait rien, et rien
// n'empêchait d'en enchaîner — seul le quota de requêtes par adresse bornait alors la charge, jamais le budget de
// calcul, alors que c'est lui qui protège le processus. Les millisecondes sous le seuil s'additionnent maintenant par
// adresse et sont imputées dès qu'elles franchissent SEARCH_BUDGET_MIN_MS : le total facturé est le même qu'avec des
// recherches longues, et une recherche ordinaire isolée continue de ne rien peser. La table est bornée à
// SEARCH_CRUMBS_MAX adresses ET PURGÉE CHAQUE MINUTE (19e audit du 21/09/2026) : c'était la seule table par adresse
// du fichier sans purge horaire, si bien qu'une adresse pouvait y rester toute la vie du processus — en contradiction
// directe avec ce que la politique de confidentialité affiche (« ces compteurs portent sur la dernière minute […]
// une adresse IP peut rester en mémoire jusqu'à environ deux minutes après votre dernière requête »).
const searchCrumbs = new Map();
const SEARCH_CRUMBS_MAX = 20000;
setInterval(function(){
  const limite = Date.now() - 60000;
  for(const [ip, e] of searchCrumbs){ if(e.t < limite) searchCrumbs.delete(ip); }
}, 60000).unref();
function chargeSearchMs(req, ms){
  if(ms > SEARCH_BUDGET_MIN_MS) return cpuBudgetCharge(req, ms);
  const ip = cpuBudgetIpOf(req);
  const maintenant = Date.now();
  const e = searchCrumbs.get(ip);
  const cumul = (e && maintenant - e.t <= 60000 ? e.ms : 0) + ms;
  if(cumul > SEARCH_BUDGET_MIN_MS){ searchCrumbs.delete(ip); return cpuBudgetCharge(req, cumul); }
  if(searchCrumbs.size >= SEARCH_CRUMBS_MAX && !searchCrumbs.has(ip)) searchCrumbs.delete(searchCrumbs.keys().next().value);
  searchCrumbs.set(ip, { t: maintenant, ms: cumul });
}
// Cache des résultats de recherche (10e audit du 18/09/2026) : une recherche courte et fréquente (« san » avec le pays
// US, « sant » avec FR) coûte jusqu'à 1 s ; une trentaine d'appels venus d'adresses différentes suffisaient à épuiser
// le budget de calcul global. L'index ne change pas pendant la vie du process : une réponse déjà calculée est rendue
// telle quelle, sans calcul. 5 000 entrées au plus (quelques Mo), les plus anciennes sortent d'abord.
// Limite assumée du budget global : le moteur est synchrone et tient ~3 Go en mémoire — le dupliquer dans des workers
// pour isoler les calculs n'est pas possible sur l'hébergement mutualisé. Quelques adresses IP qui enchaînent des
// tirages lourds (≈ 4 s chacun) peuvent donc encore occuper le process ; les quotas par IP en fixent le nombre minimal.
const SEARCH_CACHE_MAX = 5000;
const searchCache = new Map();
// La saisie voyage dans le CORPS d'un POST, plus dans l'URL (17e audit du 20/09/2026). Constaté en production : le
// pare-feu de l'hébergement (o2switch PowerBoost) répond 404 À LA PLACE du site pour certaines URL contenant de
// l'écriture arabe — la requête n'atteint jamais Node. Mesuré sur les 25 plus grandes villes dont le nom arabe est
// publié : 7 bloquées (Mumbai, Mexico, Karachi, Delhi, Moscou, Ho Chi Minh-Ville, Harbin), soit 28 %, alors que le
// dépôt compte 1 347 villes de plus de 300 000 habitants dans cette écriture. Aucun motif commun ne sépare les
// saisies bloquées des autres (sous-chaîne, lettre, longueur, encodage : tous cherchés), et le même texte passe sans
// problème dans le CORPS d'un POST — c'est donc l'URL seule qu'il inspecte, et le corps qui règle le problème.
// Le GET reste servi : il marche pour l'immense majorité des saisies, et rien ne justifie de casser un client tiers.
// Mêmes quotas pour les deux (RATE_LIMITS porte sur le chemin, pas sur la méthode) et même budget de calcul.
// Chaînes SEULEMENT (comme clip pour le PDF, 9e audit du 18/09/2026) : en POST, un champ peut être n'importe quel
// objet JSON, et String({toString:1}) lève une TypeError — 500 au lieu de 400, trouvé par le test des corps
// aberrants. En GET, un paramètre répété arrivait en tableau et devenait « a,b » : refusé de la même façon.
function texteSimple(v){ return typeof v === 'string' ? v : (typeof v === 'number' || typeof v === 'boolean') ? String(v) : ''; }
function searchCityHandler(req, res, params){
  var q = texteSimple(params.q);
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
  function chargeSearch(){ chargeSearchMs(req, performance.now() - t0); }
  try {
    var limitRaw = parseInt(params.limit, 10);
    var limit = (isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 20) ? limitRaw : 8;
    // Pays prioritaire (celui de la langue d'interface) : ses lieux passent avant tous les autres, triés entre eux
    // par population comme le reste.
    var country = /^[A-Z]{2}$/.test(texteSimple(params.country)) ? texteSimple(params.country) : '';
    // lang : langue d'interface, pour choisir le nom alternatif affiché entre parenthèses.
    var lang = /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(texteSimple(params.lang)) ? texteSimple(params.lang) : '';
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
    // Message BORNÉ à 200 caractères (18e audit du 21/09/2026) : il peut reprendre la saisie du visiteur, et rien ne
    // limitait sa longueur dans le journal de l'hébergeur. JSON.stringify échappe déjà les retours à la ligne, donc
    // aucune ligne ne peut être forgée ; seule la taille restait libre.
    console.warn('[search-city] erreur:', JSON.stringify(String(err && err.message).slice(0, 200)));
    res.status(500).json({ error: 'internal error', results: [] });
  }
}
app.get('/api/search-city', cpuBudgetGuard, function(req, res){
  searchCityHandler(req, res, req.query);
});
// 2 ko : la saisie est bornée à 120 caractères, les autres champs à quelques octets — au-delà, ce n'est pas une
// recherche de ville. Un corps absent ou mal formé donne le même « invalid query » qu'une saisie vide.
app.post('/api/search-city', cpuBudgetGuard, express.json({ limit: '2kb' }), function(req, res){
  var b = req.body;
  searchCityHandler(req, res, (b && typeof b === 'object' && !Array.isArray(b)) ? b : {});
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
    // Fil de travail de l'export : il lit les polices (26 Mo de fichiers, ~140 Mo une fois les tables OpenType
    // analysées) et les préchauffe de son côté, une fois, au démarrage — sinon le premier export les paierait et le
    // visiteur, imputé de ces ~3 s, recevait ensuite un 429. Ce processus-ci ne les charge plus du tout (17e audit du
    // 20/09/2026) : il n'en a besoin qu'en repli, si le fil venait à manquer.
    return PdfService.démarrer().then(function(){
      const e = PdfService.status();
      // Code d'erreur seul (12e audit du 19/09/2026), comme landGrid / tollGrid : le message contenait le chemin absolu
      // du fichier manquant, exposé à tous par /api/status. Message complet : journal du fil.
      startupStatus.pdfFonts = e.fontsError ? 'ÉCHEC (' + e.fontsError + ')' : e.statut;
    });
  });
// Quota de débit des GROS fichiers statiques (3e audit du 17/09/2026) : `/js/i18n.js` fait 11 Mo non compressé et le
// limiteur ne couvrait que /api/ — un client refusant la compression (Accept-Encoding: identity) pouvait en tirer
// autant de fois qu'il voulait. 30 requêtes par minute et par IP sur ces fichiers, bien au-delà d'un usage réel (le
// navigateur les met en cache et les revalide).
// 18e audit du 21/09/2026 : le quota comptait des REQUÊTES, pas des octets — les quatre fichiers visés vont de 6 ko
// (style.css, 70 513 octets non compressés, 18 343 en brotli) à 11 Mo (i18n.js non compressé), et les mêmes
// 30 requêtes valaient donc 0,5 Mo ou 330 Mo selon celui qu'on demandait. Un plafond d'octets par minute et par
// adresse s'y ajoute, réglé assez haut pour qu'aucun navigateur ne l'atteigne : une page complète tire environ
// 1,2 Mo compressés, soit plus de cent chargements par minute avant d'y toucher, mais seulement vingt lectures
// d'i18n.js non compressé (mesuré au 19e audit : 20 lectures, 224,0 Mio, avant le premier 429). Les 304 de revalidation ne
// portent aucun octet et ne comptent donc ni en requêtes (déjà le cas) ni en octets.
const BIG_STATIC_RE = /^\/(js\/(i18n|trip-data|app)\.js|css\/style\.css)$/;
const bigStaticHits = new Map();
// Par minute et par adresse. Réglable par l'environnement UNIQUEMENT pour les tests : sans cela, éprouver ce plafond
// demande d'envoyer 220 Mo (19e audit du 21/09/2026).
const BIG_STATIC_BYTES_MAX = (function(){
  const v = parseInt(process.env.BIG_STATIC_BYTES_MAX, 10);
  return (isFinite(v) && v >= 65536 && v <= 4 * 1024 * 1024 * 1024) ? v : 220 * 1024 * 1024;
})();
const bigStaticBytes = new Map();
setInterval(function(){
  const now = Date.now();
  for(const [ip, hits] of bigStaticHits){ if(!hits.length || now - hits[hits.length - 1] > 60000) bigStaticHits.delete(ip); }
  for(const [ip, o] of bigStaticBytes){ if(now - o.t > 60000) bigStaticBytes.delete(ip); }
}, 60000).unref();
// Test sur le chemin DÉCODÉ et normalisé, sans tenir compte de la casse (9e audit du 18/09/2026) : « /js/%6918n.js »,
// « /js//i18n.js » ou « /css/../js/i18n.js » échappaient au quota, puis express.static les servait quand même.
app.use(function(req, res, next){
  if(!BIG_STATIC_RE.test((req.normPath || req.path).toLowerCase())) return next();
  // Même contrôle d'origine que sur /api/ (19e audit du 21/09/2026). Le raisonnement du 11e audit — « une page tierce
  // pouvait faire lancer des requêtes par les navigateurs de ses visiteurs » — vaut mot pour mot ici, et le quota de
  // ces quatre fichiers est ce qui rend le SITE ENTIER inutilisable quand il est épuisé : trente balises
  // « <img src="…/css/style.css?1"> » sur une page tierce suffisaient à faire répondre 429 à la feuille de style et
  // aux trois scripts pendant une minute, pour 537 ko envoyés. Mesuré au 19e audit ; l'accueil se chargeait encore,
  // mais sans style ni code. Aucun usage légitime n'existe : ces fichiers ne servent qu'aux pages du site lui-même.
  if(estCrossSite(req)) return res.status(403).type('text/plain').send('Cross-site request');
  const ip = req.ip || 'inconnu';
  const now = Date.now();
  let hits = bigStaticHits.get(ip);
  if(!hits){ hits = []; bigStaticHits.set(ip, hits); }
  while(hits.length && now - hits[0] > 60000) hits.shift();
  let octets = bigStaticBytes.get(ip);
  if(!octets || now - octets.t > 60000){ octets = { t: now, n: 0 }; bigStaticBytes.set(ip, octets); }
  if(hits.length >= 30 || octets.n >= BIG_STATIC_BYTES_MAX){
    res.setHeader('Retry-After', '60');
    return res.status(429).type('text/plain').send('Too many requests');
  }
  hits.push(now);
  // Revalidation (304, aucun octet de contenu) : décomptée (11e audit du 19/09/2026) — chaque chargement de page comptait
  // 4 fichiers même en 304, et au 8e chargement dans la minute i18n.js répondait 429 : le site ne marchait plus, plus
  // vite encore derrière une adresse partagée (entreprise, école, opérateur mobile).
  // Octets RÉELLEMENT écrits sur la socket, relevés à la FERMETURE de la réponse (19e audit du 21/09/2026).
  // Auparavant : Content-Length relevé sur « finish ». Deux trous, mesurés : « finish » ne se déclenche PAS sur une
  // réponse que le client interrompt, si bien que le compteur restait à zéro — 30 coupures à 10 Mio tiraient 301,9 Mio
  // en une minute contre 224,0 Mio pour un client honnête, le plafond ne mordant que sur ce dernier ; et une requête
  // HEAD, qui n'envoie aucun corps, comptait l'entièreté du Content-Length. Les réponses d'une même connexion étant
  // sérialisées, l'écart de `bytesWritten` de la socket entre le début et la fin de CETTE réponse est bien la sienne.
  const socket = res.socket;
  const octetsDébut = socket ? socket.bytesWritten : 0;
  res.on('close', function(){
    if(res.statusCode === 304 && res.writableEnded){
      const i = hits.lastIndexOf(now);
      if(i >= 0) hits.splice(i, 1);
      return; // revalidation : aucun octet de contenu, ni requête ni octets décomptés
    }
    const n = socket ? socket.bytesWritten - octetsDébut : 0;
    if(isFinite(n) && n > 0) octets.n += n;
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
  // Corps trop gros (17e audit du 20/09/2026) : message PROPRE À LA CAUSE, que le client affiche tel quel (« itinéraire
  // trop volumineux »), au lieu du « bad request » générique qui devenait un « réessayez » sans effet — réessayer le même
  // itinéraire redonnerait le même 413. Même forme que le 413 de trop de caractères distincts (« too many distinct
  // characters »), déjà rendu par la route elle-même.
  const tooLarge = status === 413 || (err && err.type === 'entity.too.large');
  // Message PROPRE À LA ROUTE (18e audit du 21/09/2026) : tout corps trop gros répondait « trip too large », y
  // compris sur /api/search-city, où « itinéraire trop volumineux » ne veut rien dire. Le client n'affiche ce
  // message tel quel que pour l'export (export.tooLarge) ; ailleurs, il lui suffit de savoir que la requête a été
  // refusée.
  const pdfTrop = tooLarge && isPdfExport;
  res.status(tooLarge ? 413 : status).json({ error: pdfTrop ? 'trip too large' : tooLarge ? 'request too large' : (status === 500 ? 'internal error' : 'bad request') });
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
    // ORDRE (19e audit du 21/09/2026) : on ferme d'abord l'écoute — plus aucune nouvelle requête n'entre, les
    // réponses en cours vont au bout —, et on n'arrête le fil de l'export QU'ENSUITE. L'ordre inverse rejetait
    // l'export en cours avec un 503 « busy » à chaque redéploiement, c'est-à-dire exactement le cas que le
    // commentaire ci-dessus dit avoir corrigé. Le fil est de toute façon arrêté par le filet de 10 s, et `unref` sur
    // le fil au repos l'empêche déjà de retenir le processus.
    httpServer.close(function(){
      Promise.resolve(PdfService.stop()).catch(function(){}).then(function(){ process.exit(0); });
    });
    setTimeout(function(){
      Promise.resolve(PdfService.stop()).catch(function(){});
      process.exit(0);
    }, 10000).unref(); // filet : connexions gardées ouvertes
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
