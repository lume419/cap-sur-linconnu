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
const tripEngine = require('./lib/trip-engine.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Compression gzip/brotli sur toutes les réponses (texte : HTML/CSS/JS/JSON, et surtout les
// fichiers communes-XX.txt/aliases-XX.txt sous /data — ~25 Mo au total à ce jour, voir "Sources
// des données" du README) : du texte brut compresse typiquement à 70-85%, un gain net sur le
// premier chargement du formulaire (le champ "ville de départ" reste désactivé tant que ces
// fichiers ne sont pas tous arrivés, voir buildCommunesFetches côté client). Placé tout en haut,
// avant la moindre route/middleware, pour s'appliquer à toutes les réponses sans exception.
app.use(compression());

// Code département (INSEE) -> nom, utilisé pour désambiguïser les communes homonymes sur
// Wikipédia (ex. il existe trois communes "Thoiry" : Ain, Savoie, Yvelines — l'article vaut
// alors "Thoiry (Ain)", pas "Thoiry"). Source : geo.api.gouv.fr (IGN / Etalab).
const DEPARTMENTS = {"01":"Ain","02":"Aisne","03":"Allier","04":"Alpes-de-Haute-Provence","05":"Hautes-Alpes","06":"Alpes-Maritimes","07":"Ardèche","08":"Ardennes","09":"Ariège","10":"Aube","11":"Aude","12":"Aveyron","13":"Bouches-du-Rhône","14":"Calvados","15":"Cantal","16":"Charente","17":"Charente-Maritime","18":"Cher","19":"Corrèze","2A":"Corse-du-Sud","2B":"Haute-Corse","21":"Côte-d'Or","22":"Côtes-d'Armor","23":"Creuse","24":"Dordogne","25":"Doubs","26":"Drôme","27":"Eure","28":"Eure-et-Loir","29":"Finistère","30":"Gard","31":"Haute-Garonne","32":"Gers","33":"Gironde","34":"Hérault","35":"Ille-et-Vilaine","36":"Indre","37":"Indre-et-Loire","38":"Isère","39":"Jura","40":"Landes","41":"Loir-et-Cher","42":"Loire","43":"Haute-Loire","44":"Loire-Atlantique","45":"Loiret","46":"Lot","47":"Lot-et-Garonne","48":"Lozère","49":"Maine-et-Loire","50":"Manche","51":"Marne","52":"Haute-Marne","53":"Mayenne","54":"Meurthe-et-Moselle","55":"Meuse","56":"Morbihan","57":"Moselle","58":"Nièvre","59":"Nord","60":"Oise","61":"Orne","62":"Pas-de-Calais","63":"Puy-de-Dôme","64":"Pyrénées-Atlantiques","65":"Hautes-Pyrénées","66":"Pyrénées-Orientales","67":"Bas-Rhin","68":"Haut-Rhin","69":"Rhône","70":"Haute-Saône","71":"Saône-et-Loire","72":"Sarthe","73":"Savoie","74":"Haute-Savoie","75":"Paris","76":"Seine-Maritime","77":"Seine-et-Marne","78":"Yvelines","79":"Deux-Sèvres","80":"Somme","81":"Tarn","82":"Tarn-et-Garonne","83":"Var","84":"Vaucluse","85":"Vendée","86":"Vienne","87":"Haute-Vienne","88":"Vosges","89":"Yonne","90":"Territoire de Belfort","91":"Essonne","92":"Hauts-de-Seine","93":"Seine-Saint-Denis","94":"Val-de-Marne","95":"Val-d'Oise","971":"Guadeloupe","972":"Martinique","973":"Guyane","974":"La Réunion","976":"Mayotte"};

// Cache en mémoire (process unique) : évite de refrapper Wikipédia à chaque affichage de la
// même commune. Pas de limite de taille ni de persistance — ~35 000 communes maximum possibles,
// largement soutenable en mémoire pour une chaîne de courtes réponses JSON.
const photoCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Seules des lettres minuscules (2-3, sous-domaines Wikipédia standards, ex. "fr", "es", "pt") —
// filet de sécurité avant d'insérer la valeur dans une URL, jamais un souci en usage normal
// (voir VISITOR_LANG côté client, qui produit déjà une valeur propre).
function sanitizeLangCode(raw){
  const code = String(raw || '').toLowerCase();
  return /^[a-z]{2,3}$/.test(code) ? code : 'fr';
}

async function fetchWikiSummary(title, lang){
  const resp = await fetch('https://' + sanitizeLangCode(lang) + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title), {
    headers: {
      'User-Agent': 'CapSurLInconnu/1.0 (road trip generator, personal use; https://github.com/lume419/cap-sur-linconnu)',
      'Accept': 'application/json'
    }
  });
  if(!resp.ok) return null;
  return resp.json();
}

// Résout une vraie photo Wikipédia pour une commune, dans la langue du VISITEUR (lang — voir
// VISITOR_LANG côté client), pas celle de la commune ni celle de l'interface. Essaie d'abord
// "Nom (Région)" quand la région est connue (la convention de désambiguïsation de Wikipédia pour
// les lieux homonymes), puis "Nom" seul. Pour la France, "Région" vient de la table DEPARTMENTS
// (code -> nom) ; pour les autres pays, le nom de région est déjà en clair dans les données (voir
// scripts/build-country-communes.js), pas besoin de table de correspondance. Si le résultat est
// une page d'homonymie (plusieurs lieux du même nom, région inconnue), on renvoie "pas de photo"
// plutôt qu'une image potentiellement fausse — mieux vaut aucune image qu'une image du mauvais endroit.
async function resolvePlacePhoto(name, deptCode, country, lang){
  const deptName = (!country || country === 'FR') ? (deptCode && DEPARTMENTS[deptCode]) : (deptCode || null);
  const attempts = [];
  if(deptName) attempts.push(name + ' (' + deptName + ')');
  attempts.push(name);

  let bestNoImage = null; // meilleure page trouvée SANS photo, gardée en repli (voir plus bas)
  for(const title of attempts){
    let data;
    try { data = await fetchWikiSummary(title, lang); } catch(e){ console.warn('[photo] échec pour "'+title+'":', e.message); continue; }
    if(!data || data.type === 'disambiguation') continue;
    const thumbSource = (data.thumbnail && data.thumbnail.source) || null;
    const originalSource = (data.originalimage && data.originalimage.source) || null;
    const wikiUrl = (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) || null;
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
    const image = originalSource || thumbSource;
    const imageFull = originalSource || thumbSource;
    return { image: image, imageFull: imageFull, wikiUrl: wikiUrl, title: data.title || title };
  }
  return bestNoImage || { image: null, imageFull: null, wikiUrl: null, title: null };
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
  const [overpassResult, wikiResult] = await Promise.all([
    fetchRealPOIs(lat, lon).catch(() => null),
    tryMonuments ? fetchCommuneMonuments(name, deptCode).catch(() => null) : Promise.resolve(null)
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
    const poi = { name, type };
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
  const country = String(req.query.country || '').trim().toUpperCase();
  // Englobe la France, l'Andorre, l'Espagne, le Portugal (mainland), la Belgique, les Pays-Bas, le
  // Luxembourg, la Suisse, l'Allemagne et l'Italie — pas seulement la France : la borne d'origine
  // (lat 40-52) rejetait à tort le sud de l'Espagne/Portugal (Andalousie, Algarve, jusqu'à ~36°N).
  // La Belgique (lat ~49,5-51,5 / lon ~2,5-6,4) tenait déjà dans cette boîte, mais les Pays-Bas
  // débordent au nord : Schiermonnikoog et les îles Wadden montent jusqu'à ~53,5°N, au-delà de
  // l'ancienne borne à 52° — élargie à 54° pour les couvrir avec une marge. La Suisse déborde à
  // l'est : la vallée de Müstair (Grisons) monte jusqu'à ~10,46°E, au-delà de l'ancienne borne à
  // 10° — élargie à 11° pour la couvrir avec une marge (avec le Luxembourg, entièrement dans la
  // boîte d'origine, sans ajustement nécessaire). L'Allemagne déborde des deux côtés à la fois :
  // Sylt (Schleswig-Holstein) monte jusqu'à ~55,05°N, au-delà de la borne à 54° héritée des
  // Pays-Bas — élargie à 56° ; et Görlitz (frontière polonaise) va jusqu'à ~15,03°E, bien au-delà de
  // la borne à 11° héritée de la Suisse — élargie à 16°, avec une marge dans les deux cas. L'Italie
  // déborde encore un peu plus à l'est : le Salento (talon de la botte, Pouilles) va jusqu'à
  // ~18,49°E, au-delà de la borne à 16° héritée de l'Allemagne — élargie à 19°. Aucun ajustement au
  // sud pour l'Italie elle-même (lat min italienne ~36,7°N, dans la boîte d'origine grâce à
  // l'Andalousie/l'Algarve). Saint-Marin, le Liechtenstein et Monaco tiennent déjà largement dans
  // cette boîte, sans ajustement. Malte, elle, déborde bel et bien au sud : son point le plus
  // méridional (Ħal Far, sud de l'île principale) descend jusqu'à ~35,82°N, sous la borne à 36°
  // héritée de l'Espagne/Portugal — élargie à 35,7° pour la couvrir avec une marge (Gozo, plus au
  // nord, tenait déjà dans la boîte). Guernesey/Jersey (lat ~49,2-49,5°N, lon ~-2,7 à -1,9°E) et la
  // République tchèque (lat ~48,5-51,1°N, lon ~12,1-18,9°E) tenaient déjà largement dans la boîte
  // d'origine, sans ajustement. La Pologne, elle, déborde nettement à l'est : son point le plus
  // oriental (près de Zosin, Lubelskie, frontière ukraino-biélorusse) va jusqu'à ~24,15°E, bien
  // au-delà de la borne à 19° héritée de l'Italie — élargie à 24,2° pour la couvrir avec une marge
  // (le nord et le sud du pays, lat ~49-54,9°N, tenaient déjà dans la boîte). La Slovaquie (lat
  // ~47,7-49,6°N, lon ~16,8-22,6°E), la Hongrie (lat ~45,7-48,6°N, lon ~16,1-22,9°E) et la Slovénie
  // (lat ~45,4-46,9°N, lon ~13,4-16,6°E) tenaient toutes les trois déjà largement dans la boîte
  // élargie pour la Pologne, sans ajustement supplémentaire. La Croatie (lat ~42,4-46,5°N, lon
  // ~13,5-19,4°E, îles couvertes incluses) tient elle aussi largement dans cette même boîte. La
  // Bosnie-Herzégovine (lat ~42,6-45,3°N, lon ~15,7-19,6°E) y tient tout aussi largement. Le
  // Royaume-Uni, lui, déborde nettement au nord : les Shetland montent jusqu'à ~60,82°N (vérifié sur
  // communes-gb.txt), bien au-delà de la borne à 56° héritée de l'Allemagne — élargie à 61° pour les
  // couvrir avec une marge (l'Écosse continentale seule culminerait à ~58,7°N, déjà au-delà de 56°
  // aussi). Le reste du Royaume-Uni (lat min ~49,89°N aux Scilly, lon ~-8,09 à 1,75°E en Irlande du
  // Nord/Est-Anglie) tient largement dans la boîte déjà élargie pour la Pologne, sans autre
  // ajustement. L'Irlande, elle, déborde à l'ouest : sa pointe la plus occidentale (péninsule de
  // Dingle/Dunmore Head, Co. Kerry) descend jusqu'à ~-10,35°E, au-delà de la borne à -10° héritée du
  // Royaume-Uni — élargie à -10,5° pour la couvrir avec une marge (lat ~51,47-55,07°N, déjà dans la
  // boîte élargie pour le Royaume-Uni, sans ajustement supplémentaire).
  if(!isFinite(lat) || !isFinite(lon) || lat < 35.7 || lat > 61 || lon < -10.5 || lon > 24.2){
    return res.status(400).json({ error: 'invalid coordinates', pois: [] });
  }
  if(name.length > 120){
    return res.status(400).json({ error: 'invalid name', pois: [] });
  }
  // Clé par nom+département plutôt que seules les coordonnées arrondies : plus fiable pour ne
  // jamais confondre deux communes proches, et cohérent avec la recherche Wikipédia (par nom).
  const cacheKey = lat.toFixed(2) + ',' + lon.toFixed(2) + '|' + name.toLowerCase() + '|' + dept + '|' + country;
  const cached = poiCache.get(cacheKey);
  if(cached && (Date.now() - cached.ts) < POI_CACHE_TTL_MS){
    return res.json({ pois: cached.pois });
  }
  let pois = null;
  try {
    pois = await fetchAllRealPOIs(lat, lon, name, dept, country);
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
  const country = String(req.query.country || '').trim().toUpperCase();
  const lang = sanitizeLangCode(req.query.lang);
  if(!name || name.length > 120){
    return res.status(400).json({ error: 'invalid name' });
  }
  const cacheKey = name + '|' + dept + '|' + country + '|' + lang;
  const cached = photoCache.get(cacheKey);
  if(cached && (Date.now() - cached.ts) < CACHE_TTL_MS){
    return res.json(cached.data);
  }
  let data;
  try {
    data = await resolvePlacePhoto(name, dept, country, lang);
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

// Boutiques OFFICIELLES de vignette autoroutière (pas de revendeur tiers) — même URLs que
// COUNTRIES[cc].vignette côté client (public/js/app.js) ; dupliquées ici plutôt qu'importées, ce
// fichier n'ayant pas accès au module client-side (voir buildTripPdf pour l'usage).
const VIGNETTE_URLS = {
  CH: 'https://via.admin.ch/shop/',
  AT: 'https://shop.asfinag.at/en/',
  CZ: 'https://edalnice.gov.cz/en/simple-purchase',
  SK: 'https://eznamka.sk/selfcare/purchase',
  HU: 'https://ematrica.nemzetiutdij.hu/',
  SI: 'https://evinjeta.dars.si/'
};

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
  // Un seul rappel de vignette par pays sur tout le PDF (voir plus bas) — même logique que
  // shownVignetteCountries côté web (public/js/app.js, renderDays).
  const shownVignetteCountries = {};
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
      const routeWord = leg.ferryInfo ? ' de traversée · ' : ' de route · ';
      pdfText(doc, '~ ' + clip(leg.travelTime, 20) + routeWord + Math.round(leg.distanceKm) + ' km', contentX, contentWidth2);
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
    if(leg.ferryInfo){
      const f = leg.ferryInfo;
      const amountTxt = (Math.round((f.amount || 0) * 10) / 10).toFixed(1).replace('.', ',');
      pdfBullet(doc, 'Traversée en ferry (' + clip(f.route || '', 60) + ') : ~' + amountTxt + ' €.', contentX, contentWidth2);
    }
    // Rappel vignette : une seule fois par pays sur tout le PDF, comme côté web (voir
    // shownVignetteCountries plus haut).
    const vignetteUrl = leg.country && VIGNETTE_URLS[leg.country];
    if(vignetteUrl && !shownVignetteCountries[leg.country]){
      shownVignetteCountries[leg.country] = true;
      pdfBullet(doc, 'Vignette autoroutière obligatoire dans ce pays — pensez à la commander avant de partir.',
        contentX, contentWidth2, { link: vignetteUrl, color: PDF_ACCENT_3 });
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

// Regroupe TOUS les fichiers communes-XX.txt (resp. aliases-XX.txt) en une SEULE réponse chacun,
// plutôt que ~46 (resp. ~45) requêtes séparées comme avant (voir public/js/app.js pour le fetch
// côté client). Mesuré en conditions réelles sur l'hébergement mutualisé (o2switch) : peu importe
// la taille ou le contenu demandés, ~90 requêtes simultanées prennent systématiquement ~2,3 s au
// total (débit constant d'environ 40-45 requêtes/seconde, quelle que soit la concurrence
// utilisée — 6, 40 ou 92 connexions en parallèle donnent quasiment le MÊME temps total), signature
// d'une protection anti-flood de l'hébergement plutôt qu'un problème de bande passante ou de CPU
// (confirmé : demander CHAQUE fichier sans compression ne change rien non plus). Descendre à 2
// requêtes contourne cette limite entièrement, quel que soit son mécanisme exact côté hébergeur.
//
// Format du regroupement : chaque fichier est précédé d'un marqueur `###XX###` sur sa propre
// ligne (XX = code pays en MAJUSCULES, ex. `###DE###`) puis son contenu tel quel — un format
// trivial à re-découper côté client (`split` sur le marqueur). Aucune commune/alias existant ne
// contient déjà cette séquence (vérifié sur les ~650 000 lignes actuelles avant d'adopter ce
// format). La France (`communes.txt`, sans suffixe de pays dans son nom de fichier) est
// identifiée par son code `FR`, comme partout ailleurs dans `COUNTRIES` (voir app.js).
//
// Compression : PLUS AUCUNE compression n'a lieu dans ce process au moment de répondre à une
// requête — voir scripts/build-data-bundles.js, lancé une fois à chaque déploiement (via
// "postinstall" dans package.json, déclenché par "Run NPM Install" sous cPanel), jamais à chaque
// redémarrage ni à chaque requête. Deux essais précédents ont mené à cette conclusion, chacun
// mesuré en conditions réelles sur testroad.lume419.fr :
// 1. Compression à la volée à chaque requête (compression() seul) : l'hébergement mutualisé
//    compresse nettement moins bien qu'en local (-49,5 % mesuré contre -66,7 % en local, même
//    donnée) et recalcule ce travail à CHAQUE requête pour un contenu qui ne change pourtant
//    qu'au déploiement.
// 2. Compression unique au démarrage mais en tâche de fond ASYNCHRONE (tentative intermédiaire) :
//    évite bien de BLOQUER le process (voir plus bas, reste vrai pour le repli), mais sur un CPU
//    partagé déjà limité, lancer gzip+brotli en parallèle pour les deux bundles (4 tâches, pile la
//    taille par défaut du threadpool libuv) s'est mis à concurrencer le même CPU limité — mesuré
//    PLUS LENT en conditions réelles (~8 s à froid) qu'avant ce changement (~4-5 s) : l'asynchrone
//    évite de geler le process, mais ne change rien à la contention CPU réelle sur un hébergement
//    déjà à la limite.
// Seule vraie solution : ne plus compresser au moment de servir une requête, un point c'est tout.
// scripts/build-data-bundles.js écrit `communes-bundle.txt`/`.txt.gz`/`.txt.br` (et l'équivalent
// pour aliases-bundle) directement dans public/data, avec le MEILLEUR niveau de compression
// possible pour chacun — brotli à qualité MAXIMALE y compris (~67 s mesurés sur le bundle
// communes, sans problème puisque hors du chemin critique d'une requête). Ce process se contente
// de LIRE ces fichiers déjà prêts (voir loadPrecompiledBundle), un simple accès disque sans le
// moindre calcul de compression — le goulot d'origine (recompression répétée d'un contenu
// statique) disparaît entièrement plutôt que d'être seulement déplacé ou masqué.
const DATA_DIR = path.join(__dirname, 'public', 'data');
let communesBundlePromise = null, aliasesBundlePromise = null;

// Lit les trois fichiers déjà précompilés (texte, gzip, brotli) — résout `null` si le `.txt` de
// base est absent (site jamais buildé avec scripts/build-data-bundles.js, ex. juste après un
// `git clone` sans `npm install`) plutôt que d'échouer, pour laisser `getBundlePromise` basculer
// sur le repli à la volée ci-dessous ; `.gz`/`.br` individuellement absents dégradent, eux, en
// douceur vers `null` (sendBundle sait déjà s'en passer, voir plus bas).
function loadPrecompiledBundle(name){
  var txtPath = path.join(DATA_DIR, name + '.txt');
  return fs.promises.readFile(txtPath, 'utf8').then(function(raw){
    return Promise.all([
      fs.promises.readFile(txtPath + '.gz').catch(function(){ return null; }),
      fs.promises.readFile(txtPath + '.br').catch(function(){ return null; })
    ]).then(function(pair){ return { raw: raw, gzip: pair[0], br: pair[1] }; });
  }).catch(function(){ return null; });
}

// Repli à la volée si le build précompilé est absent (voir ci-dessus) — mêmes garanties qu'avant :
// jamais de variante Sync de fs/zlib ici, Node étant mono-thread pour le JS, un calcul synchrone
// de cette taille gèlerait tout le process pour toutes les requêtes en cours, pas seulement la
// sienne (constaté en direct lors d'un essai précédent). Le format ###XX###/franceCode doit rester
// synchronisé avec scripts/build-data-bundles.js, aucun des deux n'étant la référence de l'autre.
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
function buildBundleEntryFallback(re, franceCode){
  return buildBundleTextAsync(re, franceCode).then(function(raw){
    var buf = Buffer.from(raw, 'utf8');
    return new Promise(function(resolve){
      // Un seul niveau de compression ici (gzip, pas de brotli) : ce repli n'est censé servir
      // qu'exceptionnellement (build précompilé manquant), pas de raison d'y reproduire la
      // contention CPU qui a justifié tout ce refactor.
      zlib.gzip(buf, { level: zlib.constants.Z_BEST_COMPRESSION }, function(err, result){
        resolve({ raw: raw, gzip: err ? null : result, br: null });
      });
    });
  });
}
function getBundlePromise(name, re, franceCode){
  return loadPrecompiledBundle(name).then(function(entry){
    return entry !== null ? entry : buildBundleEntryFallback(re, franceCode);
  });
}
function sendBundle(req, res, entry){
  var acceptEncoding = req.headers['accept-encoding'] || '';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Vary', 'Accept-Encoding'); // la réponse diffère selon ce que le client accepte
  if(entry.br && /\bbr\b/.test(acceptEncoding)){
    res.setHeader('Content-Encoding', 'br');
    res.end(entry.br);
  } else if(entry.gzip && /\bgzip\b/.test(acceptEncoding)){
    res.setHeader('Content-Encoding', 'gzip');
    res.end(entry.gzip);
  } else {
    res.end(entry.raw); // navigateur sans compression (rarissime en 2026), ou échec zlib imprévu
  }
}
app.get('/data/communes-bundle.txt', function(req, res){
  if(communesBundlePromise === null){
    communesBundlePromise = getBundlePromise('communes-bundle', /^communes(?:-([a-z]{2}))?\.txt$/, 'FR');
  }
  communesBundlePromise.then(function(entry){ sendBundle(req, res, entry); })
    .catch(function(err){ res.status(500).type('text/plain').send('Erreur bundle communes : ' + err.message); });
});
app.get('/data/aliases-bundle.txt', function(req, res){
  if(aliasesBundlePromise === null){
    aliasesBundlePromise = getBundlePromise('aliases-bundle', /^aliases-([a-z]{2})\.txt$/, '');
  }
  aliasesBundlePromise.then(function(entry){ sendBundle(req, res, entry); })
    .catch(function(err){ res.status(500).type('text/plain').send('Erreur bundle alias : ' + err.message); });
});

// Depuis le passage "recherche et tirage aléatoire côté serveur" (voir README), ces deux routes
// /data/*-bundle.txt ne sont plus consommées QUE par ce process lui-même (voir juste en dessous) —
// le navigateur ne les demande plus jamais directement. Gardées telles quelles : lib/trip-engine.js
// réutilise le même texte brut déjà lu ici (`entry.raw`) plutôt que de relire les fichiers sources
// une seconde fois, et la route reste utile pour inspecter le bundle brut à la main si besoin.
//
// lib/trip-engine.js — voir son commentaire d'en-tête pour le détail complet. Initialisé UNE
// SEULE FOIS ici, juste après le démarrage du process (donc avant qu'aucun trafic réel ne puisse
// arriver dans la même tâche) plutôt qu'au premier /api/search-city ou /api/generate-trip reçu :
// le tout premier visiteur après un redémarrage n'a ainsi jamais à attendre ce calcul.
if(communesBundlePromise === null){
  communesBundlePromise = getBundlePromise('communes-bundle', /^communes(?:-([a-z]{2}))?\.txt$/, 'FR');
}
if(aliasesBundlePromise === null){
  aliasesBundlePromise = getBundlePromise('aliases-bundle', /^aliases-([a-z]{2})\.txt$/, '');
}
const featuredTextPromise = fs.promises.readFile(path.join(DATA_DIR, 'featured.txt'), 'utf8');
Promise.all([communesBundlePromise, aliasesBundlePromise, featuredTextPromise])
  .then(function(results){
    var t0 = Date.now();
    tripEngine.init(results[0].raw, results[1].raw, results[2]);
    console.log('[trip-engine] prêt en ' + (Date.now() - t0) + ' ms.');
  })
  .catch(function(err){
    console.error('[trip-engine] échec d\'initialisation, /api/search-city et /api/generate-trip resteront indisponibles :', err.message);
  });

app.get('/api/search-city', function(req, res){
  var q = String(req.query.q || '');
  if(!q || q.length > 120){
    return res.status(400).json({ error: 'invalid query', results: [] });
  }
  if(!tripEngine.isReady()){
    return res.status(503).json({ error: 'not ready', results: [] });
  }
  try {
    var limitRaw = parseInt(req.query.limit, 10);
    var limit = (isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 20) ? limitRaw : 8;
    res.json({ results: tripEngine.searchCity(q, limit) });
  } catch(err){
    console.warn('[search-city] erreur:', err.message);
    res.status(500).json({ error: 'internal error', results: [] });
  }
});

app.post('/api/generate-trip', express.json({ limit: '16kb' }), function(req, res){
  if(!tripEngine.isReady()){
    return res.status(503).json({ error: 'not ready' });
  }
  try {
    res.json(tripEngine.generateTrip(req.body));
  } catch(err){
    // Toute erreur ici vient soit d'une entrée invalide (voir la validation en tête de
    // generateTrip), soit d'un cas limite du moteur (ex. aucune commune atteignable) — jamais
    // d'une panne interne à cacher : 400 dans les deux cas, avec le message tel quel (déjà en
    // français, déjà écrit pour être compréhensible, voir lib/trip-engine.js).
    res.status(400).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'public'), {
  // Les données (communes.txt, communes-XX.txt, featured.txt) sont volumineuses mais
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
