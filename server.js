// Serveur minimal : sert le dossier public/ tel quel (HTML, CSS, JS, données), plus deux routes
// API — une qui va chercher une vraie photo sur Wikipédia, une qui va chercher de vrais points
// d'intérêt sur OpenStreetMap (voir plus bas). Aucune donnée du visiteur n'est reçue ni conservée ;
// le seul état en mémoire est le cache de ces deux routes.
const path = require('path');
const express = require('express');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// Code département (INSEE) -> nom, utilisé pour désambiguïser les communes homonymes sur
// Wikipédia (ex. il existe trois communes "Thoiry" : Ain, Savoie, Yvelines — l'article vaut
// alors "Thoiry (Ain)", pas "Thoiry"). Source : geo.api.gouv.fr (IGN / Etalab).
const DEPARTMENTS = {"01":"Ain","02":"Aisne","03":"Allier","04":"Alpes-de-Haute-Provence","05":"Hautes-Alpes","06":"Alpes-Maritimes","07":"Ardèche","08":"Ardennes","09":"Ariège","10":"Aube","11":"Aude","12":"Aveyron","13":"Bouches-du-Rhône","14":"Calvados","15":"Cantal","16":"Charente","17":"Charente-Maritime","18":"Cher","19":"Corrèze","2A":"Corse-du-Sud","2B":"Haute-Corse","21":"Côte-d'Or","22":"Côtes-d'Armor","23":"Creuse","24":"Dordogne","25":"Doubs","26":"Drôme","27":"Eure","28":"Eure-et-Loir","29":"Finistère","30":"Gard","31":"Haute-Garonne","32":"Gers","33":"Gironde","34":"Hérault","35":"Ille-et-Vilaine","36":"Indre","37":"Indre-et-Loire","38":"Isère","39":"Jura","40":"Landes","41":"Loir-et-Cher","42":"Loire","43":"Haute-Loire","44":"Loire-Atlantique","45":"Loiret","46":"Lot","47":"Lot-et-Garonne","48":"Lozère","49":"Maine-et-Loire","50":"Manche","51":"Marne","52":"Haute-Marne","53":"Mayenne","54":"Meurthe-et-Moselle","55":"Meuse","56":"Morbihan","57":"Moselle","58":"Nièvre","59":"Nord","60":"Oise","61":"Orne","62":"Pas-de-Calais","63":"Puy-de-Dôme","64":"Pyrénées-Atlantiques","65":"Hautes-Pyrénées","66":"Pyrénées-Orientales","67":"Bas-Rhin","68":"Haut-Rhin","69":"Rhône","70":"Haute-Saône","71":"Saône-et-Loire","72":"Sarthe","73":"Savoie","74":"Haute-Savoie","75":"Paris","76":"Seine-Maritime","77":"Seine-et-Marne","78":"Yvelines","79":"Deux-Sèvres","80":"Somme","81":"Tarn","82":"Tarn-et-Garonne","83":"Var","84":"Vaucluse","85":"Vendée","86":"Vienne","87":"Haute-Vienne","88":"Vosges","89":"Yonne","90":"Territoire de Belfort","91":"Essonne","92":"Hauts-de-Seine","93":"Seine-Saint-Denis","94":"Val-de-Marne","95":"Val-d'Oise","971":"Guadeloupe","972":"Martinique","973":"Guyane","974":"La Réunion","976":"Mayotte"};

// Cache en mémoire (process unique) : évite de refrapper Wikipédia à chaque affichage de la
// même commune. Pas de limite de taille ni de persistance — ~35 000 communes maximum possibles,
// largement soutenable en mémoire pour une chaîne de courtes réponses JSON.
const photoCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function fetchWikiSummary(title){
  const resp = await fetch('https://fr.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title), {
    headers: {
      'User-Agent': 'CapSurLInconnu/1.0 (road trip generator, personal use; https://github.com/lume419/cap-sur-linconnu)',
      'Accept': 'application/json'
    }
  });
  if(!resp.ok) return null;
  return resp.json();
}

// Résout une vraie photo Wikipédia pour une commune. Essaie d'abord "Nom (Département)" quand
// le département est connu (la convention de désambiguïsation de Wikipédia pour les communes
// homonymes), puis "Nom" seul. Si le résultat est une page d'homonymie (plusieurs communes du
// même nom, département inconnu), on renvoie "pas de photo" plutôt qu'une image potentiellement
// fausse — mieux vaut aucune image qu'une image du mauvais endroit.
async function resolvePlacePhoto(name, deptCode){
  const deptName = deptCode && DEPARTMENTS[deptCode];
  const attempts = [];
  if(deptName) attempts.push(name + ' (' + deptName + ')');
  attempts.push(name);

  for(const title of attempts){
    let data;
    try { data = await fetchWikiSummary(title); } catch(e){ console.warn('[photo] échec pour "'+title+'":', e.message); continue; }
    if(!data || data.type === 'disambiguation') continue;
    const thumbSource = (data.thumbnail && data.thumbnail.source) || null;
    const originalSource = (data.originalimage && data.originalimage.source) || null;
    if(!thumbSource && !originalSource) continue;
    // La vignette renvoyée par l'API "summary" ne fait qu'environ 320px de large — nette en petite
    // icône, mais visiblement floue une fois affichée en grand bandeau. On a essayé de demander à
    // Wikimedia une vignette plus large en modifiant la largeur dans l'URL (".../800px-fichier.jpg"),
    // mais leur service refuse ces tailles "à la demande" non déjà mises en cache (protection
    // anti-abus, HTTP 400 "Use thumbnail sizes listed on...") même quand l'image d'origine est bien
    // plus grande. La solution fiable est donc d'utiliser directement l'image d'origine (résolution
    // native), qui elle est toujours disponible — au prix d'un téléchargement un peu plus lourd.
    const image = originalSource || thumbSource;
    const imageFull = originalSource || thumbSource;
    return {
      image: image,
      imageFull: imageFull,
      wikiUrl: (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) || null,
      title: data.title || title
    };
  }
  return { image: null, imageFull: null, wikiUrl: null, title: null };
}

// "Lieux et monuments" depuis Wikipédia, en complément d'Overpass : l'article de la commune a
// souvent une section listant son patrimoine local, parfois illustrée par une galerie de photos —
// y compris pour des lieux qui n'ont pas leur propre article Wikipédia (donc aucune photo possible
// via resolvePlacePhoto), comme une petite église ou chapelle de village. Overpass, lui, ne connaît
// que ce qui est nommé et taggé dans OpenStreetMap : les deux sources se complètent.
async function fetchWikiWikitext(title){
  const resp = await fetch('https://fr.wikipedia.org/w/api.php?action=parse&page=' + encodeURIComponent(title) + '&prop=wikitext&format=json&formatversion=2', {
    headers: {
      'User-Agent': 'CapSurLInconnu/1.0 (road trip generator, personal use; https://github.com/lume419/cap-sur-linconnu)',
      'Accept': 'application/json'
    }
  });
  if(!resp.ok) return null;
  const data = await resp.json();
  if(data.error || !data.parse) return null;
  return data.parse.wikitext || null;
}

// Repère la section "Lieux et monuments" (ou proche : "Patrimoine", "Monuments") quel que soit son
// niveau de titre (== ou ===, ça varie d'un article à l'autre), extrait sa liste à puces et sa
// galerie d'images éventuelle.
function extractMonumentsSection(wikitext){
  const m = wikitext.match(/={2,4}\s*(?:Lieux et monuments|Patrimoine(?: architectural)?|Monuments(?: et lieux)?)\s*={2,4}\n([\s\S]*?)(?=\n={2,4}[^=]|$)/i);
  if(!m) return null;
  const section = m[1];

  const gallery = [];
  const galleryBlock = section.match(/<gallery[^>]*>([\s\S]*?)<\/gallery>/i);
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
    const line = bm[1];
    if(/^<gallery/i.test(line)) continue;
    const linkMatch = line.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
    let name = linkMatch ? linkMatch[1].trim() : line.split(/[,.;(]/)[0].trim();
    name = name.replace(/^Vestiges (du|de la|des) /i, '').trim(); // "Vestiges du château de X" -> le lieu lui-même
    if(!name || name.length < 3 || name.length > 90) continue;
    if(/^[a-zà-ÿ]/.test(name)) name = name.charAt(0).toUpperCase() + name.slice(1); // wikilien en minuscule ("[[château de X]]")
    items.push(name);
  }
  return { items, gallery };
}

// Le wikitexte ne tague pas le "type" du lieu comme le fait OpenStreetMap — simple déduction par
// mot-clé dans le nom, suffisante pour choisir une icône/étiquette cohérente avec le reste de l'app.
function inferMonumentType(name){
  const n = name.toLowerCase();
  if(/ch[aâ]teau/.test(n)) return 'castle';
  if(/manoir/.test(n)) return 'manor';
  if(/\begl?ise\b/.test(n)) return 'place_of_worship';
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
async function fetchCommuneMonuments(name, deptCode){
  const deptName = deptCode && DEPARTMENTS[deptCode];
  const attempts = [];
  if(deptName) attempts.push(name + ' (' + deptName + ')');
  attempts.push(name);
  for(const title of attempts){
    let wikitext;
    try { wikitext = await fetchWikiWikitext(title); } catch(e){ continue; }
    if(!wikitext) continue;
    const extracted = extractMonumentsSection(wikitext);
    if(extracted && extracted.items.length) return extracted;
  }
  return null;
}

function normalizePoiName(s){
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Combine les deux sources : Wikipédia d'abord (généralement plus fiable — sourcé, souvent déjà
// illustré), puis Overpass pour compléter/diversifier, dédoublonné par nom normalisé.
async function fetchAllRealPOIs(lat, lon, name, deptCode){
  const [overpassResult, wikiResult] = await Promise.all([
    fetchRealPOIs(lat, lon).catch(() => null),
    name ? fetchCommuneMonuments(name, deptCode).catch(() => null) : Promise.resolve(null)
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
      const entry = { name: itemName, type: inferMonumentType(itemName) };
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
  return shuffleArr(combined).slice(0, 12);
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
  return `[out:json][timeout:24];(
    node["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|theme_park|artwork)$"]["name"](${around});
    way["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|theme_park|artwork)$"]["name"](${around});
    node["historic"~"^(monument|memorial|archaeological_site|castle|ruins|fort|citadel|manor|chapel)$"]["name"](${around});
    way["historic"~"^(monument|memorial|archaeological_site|castle|ruins|fort|citadel|manor|chapel)$"]["name"](${around});
    node["natural"~"^(peak|waterfall|beach|cave_entrance)$"]["name"](${around});
    node["leisure"="nature_reserve"]["name"](${around});
  );out center 25;`;
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

async function queryOverpass(url, query){
  const controller = new AbortController();
  // Les instances publiques Overpass répondent parfois en 20s passées sous charge (constaté en
  // test réel) — sans gravité ici puisque cet enrichissement arrive en tâche de fond après
  // l'affichage initial du trajet (voir app.js), jamais avant.
  const timer = setTimeout(() => controller.abort(), 25000);
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
    const data = await resp.json();
    if(isPartialOverpassResponse(data)) throw new Error('réponse partielle (' + data.remark + ')');
    return data;
  } finally {
    clearTimeout(timer);
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
  let data = null;
  for(const url of OVERPASS_MIRRORS){
    try { data = await queryOverpass(url, query); break; }
    catch(e){ console.warn('[pois] miroir ' + url + ' en échec pour ' + lat + ',' + lon + ':', e.message); }
  }
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
    pois.push({ name, type });
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
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n))
    .replace(/&([a-zA-Z]+);/g, (m, name) => (name in HTML_NAMED_ENTITIES) ? HTML_NAMED_ENTITIES[name] : m);
}

async function fetchVisorandoHikes(communeName){
  const slug = visorandoSlug(communeName);
  if(!slug) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let resp;
  try {
    resp = await fetch('https://www.visorando.com/randonnee-' + slug + '.html', {
      headers: { 'User-Agent': VISORANDO_UA },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
  if(resp.status === 404) return []; // pas de page pour cette commune : aucune rando à proximité
  if(!resp.ok) throw new Error('HTTP ' + resp.status);
  const html = await resp.text();
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
  return hikes;
}

// Renvoie plusieurs randos (pas une seule choisie au hasard) : quand une commune a plusieurs nuits
// d'affilée, chaque jour a besoin d'une suggestion différente (voir buildActivityOptions côté
// client, qui pioche dans cette liste sans jamais reproposer la même rando deux fois pour le même
// séjour). `null` = échec réseau, pas mis en cache (on retentera) ; `{hikes:[]}` en cache = vraiment
// aucune rando trouvée pour cette commune. Plafonné à 8 : largement plus que le nombre de nuits
// possibles au même endroit dans un même voyage.
async function fetchVisorandoHikeList(communeName){
  const cacheKey = communeName.toLowerCase();
  const cached = visorandoCache.get(cacheKey);
  if(cached && (Date.now() - cached.ts) < VISORANDO_CACHE_TTL_MS){
    return cached.hikes.slice(0, 8);
  }
  let hikes;
  try {
    hikes = await fetchVisorandoHikes(communeName);
  } catch(err){
    console.warn('[hike] échec pour "' + communeName + '":', err.message);
    return null;
  }
  visorandoCache.set(cacheKey, { hikes, ts: Date.now() });
  return hikes.slice(0, 8);
}

app.get('/api/hike', async (req, res) => {
  const name = String(req.query.name || '').trim();
  if(!name || name.length > 120){
    return res.status(400).json({ error: 'invalid name', hikes: [] });
  }
  let hikes = [];
  try { hikes = (await fetchVisorandoHikeList(name)) || []; } catch(err){ /* silencieux : voir fetchVisorandoHikeList */ }
  res.json({ hikes });
});

app.get('/api/pois', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const name = String(req.query.name || '').trim();
  const dept = String(req.query.dept || '').trim();
  if(!isFinite(lat) || !isFinite(lon) || lat < 40 || lat > 52 || lon < -6 || lon > 10){
    return res.status(400).json({ error: 'invalid coordinates', pois: [] });
  }
  if(name.length > 120){
    return res.status(400).json({ error: 'invalid name', pois: [] });
  }
  // Clé par nom+département plutôt que seules les coordonnées arrondies : plus fiable pour ne
  // jamais confondre deux communes proches, et cohérent avec la recherche Wikipédia (par nom).
  const cacheKey = lat.toFixed(2) + ',' + lon.toFixed(2) + '|' + name.toLowerCase() + '|' + dept;
  const cached = poiCache.get(cacheKey);
  if(cached && (Date.now() - cached.ts) < POI_CACHE_TTL_MS){
    return res.json({ pois: cached.pois });
  }
  let pois = null;
  try {
    pois = await fetchAllRealPOIs(lat, lon, name, dept);
  } catch(err){
    console.warn('[pois] échec pour ' + cacheKey + ':', err.message);
  }
  // Ne met en cache que les échecs "propres" (requête aboutie, 0 résultat) — jamais un échec de
  // requête (les deux miroirs Overpass down), pour ne pas figer un faux négatif ; la prochaine
  // visite sur cette commune retentera au lieu de rester bloquée dessus pendant 14 jours.
  if(pois !== null){
    poiCache.set(cacheKey, { pois, ts: Date.now() });
  }
  res.json({ pois: pois || [] }); // le client ne voit jamais l'échec : juste une liste vide
});

app.get('/api/photo', async (req, res) => {
  const name = String(req.query.name || '').trim();
  const dept = String(req.query.dept || '').trim();
  if(!name || name.length > 120){
    return res.status(400).json({ error: 'invalid name' });
  }
  const cacheKey = name + '|' + dept;
  const cached = photoCache.get(cacheKey);
  if(cached && (Date.now() - cached.ts) < CACHE_TTL_MS){
    return res.json(cached.data);
  }
  let data;
  try {
    data = await resolvePlacePhoto(name, dept);
  } catch(err){
    data = { image: null, imageFull: null, wikiUrl: null, title: null };
  }
  photoCache.set(cacheKey, { data, ts: Date.now() });
  res.json(data);
});

// ============ EXPORT PDF ============
// Un vrai fichier .pdf téléchargeable en un clic (pas la fenêtre d'impression du navigateur) :
// pdfkit est du JS pur (aucun binaire externe type Chromium/wkhtmltopdf), donc sans souci sur un
// hébergement mutualisé. Le client envoie l'état ACTUEL du voyage tel qu'affiché à l'écran (voir
// buildTripExportPayload dans app.js — POI réels et randonnée Visorando déjà résolus si trouvés) ;
// le serveur ne fait que la mise en page. Rien n'est conservé ni journalisé au-delà de la réponse.

function isHttpUrl(u){
  return typeof u === 'string' && /^https?:\/\//i.test(u) && u.length < 500;
}
// Filet de sécurité contre un payload abusif (chaîne énorme) qui ralentirait inutilement la mise
// en page du PDF — jamais atteint en usage normal, l'app elle-même ne produit rien d'aussi long.
function clip(s, max){
  s = (s == null) ? '' : String(s);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// Palette approximative des tokens CSS du site (voir public/css/style.css, thème clair) — pdfkit
// ne peut pas lire les variables CSS, donc on les recopie ici en dur. Pas d'embarquement de police
// custom (Georgia/Iowan pour --font-hand, la police display du site) : les 14 polices standard PDF
// (Helvetica/Times) suffisent et évitent d'avoir à livrer/charger un fichier .ttf sur un
// hébergement mutualisé — Times-Italic sert d'équivalent au ton "manuscrit" du site.
const PDF_INK = '#1A1F1C';
const PDF_INK_SOFT = '#4A544D';
const PDF_ACCENT = '#B04A19';   // --accent (orange) : titre, badge retour, ligne "fin de mission"
const PDF_ACCENT_2 = '#8A6414'; // --accent-2 (moutarde) : activités "à faire sur place"
const PDF_ACCENT_3 = '#1F4F44'; // --accent-3 (teal) : badges de jour, liens (rando/logement), sac
const PDF_BG = '#F6F1E2';       // --surface : fond du bandeau d'en-tête
const PDF_BG_ALT = '#ECE4CC';   // --surface-2 : fond des jetons de statistiques
const PDF_LINE = '#C9C2A0';
const PDF_LINE_STRONG = '#8F8564'; // ligne de jonction entre les badges de jour ("timeline")

// Fond crème (--bg du site) plutôt qu'une page blanche brute — posé sous tout le reste à chaque
// nouvelle page (page 1 explicitement, pages suivantes via pdfRunningHeader/'pageAdded').
function pdfPageBackground(doc){
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PDF_BG);
}

function pdfEnsureSpace(doc, minHeight){
  const bottom = doc.page.height - doc.page.margins.bottom;
  if(doc.y + minHeight > bottom) doc.addPage();
}

// Écrit du texte à une position X fixe (colonne de contenu, décalée à droite des badges de jour)
// en réutilisant toujours le Y courant — évite de répéter "x, doc.y" à chaque appel.
function pdfText(doc, str, x, width, opts){
  doc.text(str, x, doc.y, Object.assign({ width: width }, opts || {}));
}

// Puce colorée (point plein) ou case à cocher (carré creux, pour le sac à préparer) suivie du
// texte — le point/la case est dessiné séparément du texte pour pouvoir lui donner une couleur
// différente selon la nature de la ligne (péage, activité, lien réel...), comme les icônes du site.
function pdfBullet(doc, text, x, width, opts){
  opts = opts || {};
  pdfEnsureSpace(doc, 24);
  const markY = doc.y + 4.6;
  if(opts.checkbox){
    doc.lineWidth(1).rect(x - 3, doc.y + 1.8, 6.4, 6.4).stroke(PDF_ACCENT_3);
  } else {
    doc.circle(x, markY, 2.1).fill(opts.color || PDF_INK_SOFT);
  }
  doc.font('Helvetica').fontSize(9.5).fillColor(opts.link ? PDF_ACCENT_3 : PDF_INK);
  pdfText(doc, text, x + 11, width - 11, { link: opts.link || undefined, underline: !!opts.link });
}

// Jeton arrondi façon ".stats span" du site (voir style.css) — la largeur dépend du texte, donc on
// la mesure avant de dessiner ; revient à la ligne si la suivante dépasserait la largeur utile.
function pdfChipRow(doc, items, x, maxWidth){
  const padX = 8, padY = 4.5, fontSize = 9, h = fontSize + padY * 2, gap = 6;
  const colors = [PDF_ACCENT_3, PDF_ACCENT_2, PDF_ACCENT];
  let cx = x, cy = doc.y, rowStartY = cy;
  doc.font('Helvetica-Bold').fontSize(fontSize);
  items.forEach(function(text, i){
    const w = doc.widthOfString(text) + padX * 2;
    if(cx > x && cx + w > x + maxWidth){ cx = x; cy += h + gap; }
    doc.roundedRect(cx, cy, w, h, h / 2).fill(colors[i % colors.length]);
    doc.fillColor('#FFFFFF').text(text, cx + padX, cy + padY - 0.5, { width: w - padX * 2, lineBreak: false });
    cx += w + gap;
  });
  doc.y = cy + h;
  doc.x = x;
}

// Bandeau de marque affiché en haut de chaque page suivant la première (qui a le grand bandeau
// complet, voir buildTripPdf) — juste assez pour rester identifiable si l'itinéraire déborde sur
// plusieurs pages, sans reproduire tout l'en-tête à chaque fois.
function pdfRunningHeader(doc, marginLeft, contentWidth, tripLabel){
  pdfPageBackground(doc);
  doc.rect(0, 0, doc.page.width, 34).fill(PDF_BG_ALT);
  doc.fillColor(PDF_ACCENT).font('Helvetica-Bold').fontSize(10).text("CAP SUR L'INCONNU", marginLeft, 12, { characterSpacing: 1 });
  doc.fillColor(PDF_INK_SOFT).font('Helvetica-Oblique').fontSize(8.5)
    .text(clip(tripLabel, 60), marginLeft, 13, { width: contentWidth, align: 'right' });
  doc.y = doc.page.margins.top;
  doc.x = marginLeft;
}

function buildTripPdf(doc, trip){
  const marginLeft = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const tripLabel = trip.tripLabel || trip.city || '';

  // Pages 2+ (si l'itinéraire déborde) : bandeau réduit, voir pdfRunningHeader. La page 1 existe
  // déjà à la construction du document (pdfkit l'ajoute avant qu'on ait pu s'abonner à
  // 'pageAdded') : elle n'est donc jamais concernée par ce bandeau réduit, seulement par le grand
  // en-tête ci-dessous — exactement le partage voulu entre les deux.
  doc.on('pageAdded', function(){ pdfRunningHeader(doc, marginLeft, contentWidth, tripLabel); });

  // ---- Grand bandeau d'en-tête (page 1 uniquement) ----
  pdfPageBackground(doc);
  doc.rect(0, 0, doc.page.width, 96).fill(PDF_ACCENT);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text("CAP SUR L'INCONNU", marginLeft, 26, { characterSpacing: 1.2 });
  doc.fillColor('#FBE7D6').font('Times-Italic').fontSize(12.5)
    .text(clip(trip.city, 80) + ' — itinéraire mystère', marginLeft, 58);
  doc.y = 114;
  doc.x = marginLeft;

  // ---- Jetons de statistiques ----
  const stats = trip.stats || {};
  const statsBits = [];
  if(stats.days) statsBits.push(stats.days + (stats.days > 1 ? ' jours' : ' jour'));
  if(stats.cities) statsBits.push(stats.cities + (stats.cities > 1 ? ' villes' : ' ville'));
  if(stats.nights != null) statsBits.push(stats.nights + (stats.nights > 1 ? ' nuitées' : ' nuitée'));
  if(stats.totalKm) statsBits.push('~' + Math.round(stats.totalKm) + ' km au total');
  if(stats.toll){
    const tollAmountTxt = (Math.round(stats.toll.amount * 10) / 10).toFixed(1).replace('.', ',');
    statsBits.push('~' + tollAmountTxt + ' € de péage ' + (stats.toll.enabled ? 'estimé' : 'évités'));
  }
  if(statsBits.length) pdfChipRow(doc, statsBits, marginLeft, contentWidth);
  doc.moveDown(1.1);

  // ---- Jours : badge rond numéroté + ligne de jonction façon "timeline" du site, contenu décalé
  // à droite des badges (contentX). Le badge du jour de retour utilise l'orange (comme la couleur
  // "final" du badge sur le site) plutôt que le teal des jours normaux. ----
  const contentX = marginLeft + 28;
  const contentWidth2 = contentWidth - 28;
  let prevBadgeCY = null;
  const legs = Array.isArray(trip.legs) ? trip.legs : [];
  legs.forEach(function(leg, idx){
    if(!leg) return;
    const pageBefore = doc.page;
    pdfEnsureSpace(doc, 74);
    const pageChanged = doc.page !== pageBefore;
    const dayTop = doc.y;
    const badgeCX = marginLeft + 9, badgeCY = dayTop + 9;
    const isReturn = !!leg.isReturn;

    if(prevBadgeCY != null && !pageChanged){
      doc.lineWidth(1.3).moveTo(badgeCX, prevBadgeCY + 9).lineTo(badgeCX, badgeCY - 9).stroke(PDF_LINE_STRONG);
    }
    doc.circle(badgeCX, badgeCY, 9).fill(isReturn ? PDF_ACCENT : PDF_ACCENT_3);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
      .text(isReturn ? 'R' : String(idx + 1), badgeCX - 9, badgeCY - 4.5, { width: 18, align: 'center' });
    prevBadgeCY = badgeCY;

    doc.y = dayTop;
    doc.fillColor(PDF_ACCENT_3).font('Helvetica-Bold').fontSize(12.5);
    pdfText(doc, clip(leg.label, 120), contentX, contentWidth2);
    if(leg.distanceKm != null && leg.travelTime){
      doc.fillColor(PDF_INK_SOFT).font('Helvetica-Oblique').fontSize(9);
      pdfText(doc, '~ ' + clip(leg.travelTime, 20) + ' de route · ' + Math.round(leg.distanceKm) + ' km', contentX, contentWidth2);
    }
    const stopLabel = (isReturn ? 'Retour vers ' : 'Étape mystère : ') + clip(leg.stop, 100) +
      (leg.cpBadge ? ' (' + clip(leg.cpBadge, 20) + ')' : '');
    doc.fillColor(PDF_INK).font('Helvetica-Bold').fontSize(10.5);
    pdfText(doc, stopLabel, contentX, contentWidth2);
    doc.moveDown(0.3);

    if(leg.tollInfo){
      const t = leg.tollInfo;
      const barrierTxt = t.fluxLibre ? 'péage à flux libre, sans barrière' : 'péage classique avec barrière';
      const amountTxt = (Math.round((t.amount || 0) * 10) / 10).toFixed(1).replace('.', ',');
      const savedMin = Math.round(t.savedMin || 0);
      const tollTxt = t.enabled
        ? ('Péage estimé : ~' + amountTxt + ' € (' + barrierTxt + ') — environ ' + savedMin + ' min gagnées par rapport à un trajet sans péage.')
        : ('Sans péage (option décochée) : environ ' + savedMin + ' min auraient pu être gagnées en autoroute (~' + amountTxt + ' €, ' + barrierTxt + ').');
      pdfBullet(doc, tollTxt, contentX, contentWidth2);
    }
    if(leg.chargeInfo){
      const c = leg.chargeInfo;
      pdfBullet(doc, c.stops + ' pause' + (c.stops > 1 ? 's' : '') + ' recharge estimée' + (c.stops > 1 ? 's' : '') +
        ' (~' + Math.round(c.minutes) + ' min au total) sur borne rapide.', contentX, contentWidth2);
    }
    const activities = Array.isArray(leg.activities) ? leg.activities : [];
    activities.slice(0, 6).forEach(function(act){
      if(!act || !act.label) return;
      const text = clip(act.label, 140) + (act.typeLabel ? ' — ' + clip(act.typeLabel, 80) : '') +
        (act.source ? ' (Source : ' + clip(act.source, 30) + ')' : '');
      const link = isHttpUrl(act.hikeUrl) ? act.hikeUrl : null;
      pdfBullet(doc, text, contentX, contentWidth2, { link: link, color: link ? PDF_ACCENT_3 : PDF_ACCENT_2 });
    });
    if(leg.lodgingLinks && leg.checkInLabel){
      // checkInLabel peut être une seule date ("20 août") ou une plage ("20 août → 22 août") pour
      // un séjour de plusieurs nuits au même endroit — une seule recherche pour tout le séjour,
      // pas une par nuit (voir buildTripExportPayload côté client). "·" plutôt que "pour le" reste
      // grammaticalement correct dans les deux cas.
      const links = leg.lodgingLinks;
      if(isHttpUrl(links.airbnb)) pdfBullet(doc, 'Logement (Airbnb) · ' + clip(leg.checkInLabel, 40), contentX, contentWidth2, { link: links.airbnb });
      if(isHttpUrl(links.booking)) pdfBullet(doc, 'Logement (Booking.com) · ' + clip(leg.checkInLabel, 40), contentX, contentWidth2, { link: links.booking });
    }
    if(isReturn){
      pdfBullet(doc, 'Fin de mission — retour à la maison, road trip mystère bouclé.', contentX, contentWidth2, { color: PDF_ACCENT });
    }
    doc.moveDown(0.75);
  });

  // ---- Sac à préparer : puces remplacées par des cases à cocher, comme sur le site ----
  const packing = Array.isArray(trip.packing) ? trip.packing : [];
  if(packing.length){
    pdfEnsureSpace(doc, 60);
    doc.lineWidth(1).moveTo(marginLeft, doc.y).lineTo(marginLeft + contentWidth, doc.y).stroke(PDF_LINE);
    doc.moveDown(0.6);
    doc.fillColor(PDF_ACCENT).font('Helvetica-Bold').fontSize(13);
    pdfText(doc, 'Sac à préparer', marginLeft, contentWidth);
    doc.fillColor(PDF_INK_SOFT).font('Helvetica-Oblique').fontSize(9.5);
    pdfText(doc, 'Pour ' + clip(trip.transportLabel, 60) + ', budget ' + clip(trip.budgetLabel, 40) + '.', marginLeft, contentWidth);
    doc.moveDown(0.5);
    packing.slice(0, 60).forEach(function(item){ pdfBullet(doc, clip(item, 120), marginLeft + 4, contentWidth - 4, { checkbox: true }); });
  }

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.moveDown(1);
  pdfEnsureSpace(doc, 30);
  doc.lineWidth(1).moveTo(marginLeft, doc.y).lineTo(marginLeft + contentWidth, doc.y).stroke(PDF_LINE);
  doc.moveDown(0.4);
  doc.fillColor(PDF_INK_SOFT).font('Helvetica').fontSize(7.5);
  pdfText(doc,
    "Généré le " + today + " par Cap sur l'inconnu — communes : IGN/geo.api.gouv.fr · points d'intérêt : " +
    "OpenStreetMap (ODbL) · péages : VINCI Autoroutes · randonnées : Visorando.",
    marginLeft, contentWidth
  );
}

app.post('/api/export-pdf', express.json({ limit: '512kb' }), (req, res) => {
  const trip = req.body;
  if(!trip || typeof trip !== 'object' || !Array.isArray(trip.legs) || trip.legs.length === 0 || trip.legs.length > 25){
    return res.status(400).json({ error: 'invalid trip data' });
  }
  const filenameBase = clip(trip.tripLabel || trip.city || 'itineraire', 60).replace(/[\\/:*?"<>|]+/g, '-') || 'itineraire';
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 55, right: 55 },
    info: { Title: "Cap sur l'inconnu - " + filenameBase }
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', "attachment; filename=\"itineraire.pdf\"; filename*=UTF-8''" + encodeURIComponent(filenameBase) + '.pdf');
  doc.pipe(res);
  try {
    buildTripPdf(doc, trip);
  } catch(err){
    console.warn('[export-pdf] erreur de mise en page:', err.message);
  }
  doc.end();
});

app.use(express.static(path.join(__dirname, 'public'), {
  // Les données (communes.txt, featured.txt, france-map.json) sont volumineuses mais
  // statiques : autant laisser les navigateurs les mettre en cache longtemps. En revanche
  // le HTML/CSS/JS change à chaque mise à jour de l'app — un cache d'1h dessus faisait qu'un
  // simple rechargement de page pouvait continuer à servir une ancienne version depuis le
  // cache navigateur sans même revalider auprès du serveur. On force donc une revalidation
  // systématique (`must-revalidate`) pour ces fichiers, tout en gardant le cache long pour
  // /data/ qui est volumineux et ne change qu'avec le code (donc avec un nouveau déploiement).
  maxAge: '1h',
  extensions: ['html'],
  setHeaders: function(res, filePath){
    if(!/[\\/]data[\\/]/.test(filePath)){
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`Cap sur l'Inconnu — http://localhost:${PORT}`);
});
