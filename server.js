// Serveur minimal : sert le dossier public/ tel quel (HTML, CSS, JS, données), plus deux routes
// API — une qui va chercher une vraie photo sur Wikipédia, une qui va chercher de vrais points
// d'intérêt sur OpenStreetMap (voir plus bas). Aucune donnée du visiteur n'est reçue ni conservée ;
// le seul état en mémoire est le cache de ces deux routes.
const path = require('path');
const express = require('express');

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
