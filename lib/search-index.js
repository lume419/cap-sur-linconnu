// Index de recherche de ville précalculé sur disque (septembre 2026).
//
// POURQUOI — avec ~4 millions de lieux, le moteur (lib/trip-engine.js) met de longues secondes à se
// charger au démarrage du serveur ; sur l'hébergement mutualisé, qui arrête l'application après une période
// sans visite, chaque premier visiteur voyait « Chargement des communes… » pendant plus d'une minute. Cet
// index est construit UNE fois au déploiement (scripts/build-search-index.js, lancé par `npm install`) et lu
// directement sur le disque : la recherche répond dès la première seconde, sans rien charger en mémoire.
//
// FORMAT (dossier cache/search-index/, jamais commité) :
//   meta.json      version, signature des fichiers de données (taille + date de chaque communes*.txt /
//                  aliases-*.txt), nombre d'entrées et de lieux
//   places.dat     un lieu par ligne : pays \t nom normalisé \t nom \t codes (séparés par ,) \t population \t
//                  lat \t lon \t région
//   placeoff.bin   Uint32 LE × (lieux + 1) : position de chaque ligne de places.dat
//   keys.bin       clés de recherche triées par OCTETS UTF-8 (nom normalisé, alias normalisé, code postal en
//                  minuscules), concaténées
//   keyoff.bin     Uint32 LE × (entrées + 1) : position de chaque clé dans keys.bin
//   entry.bin      12 octets par entrée : lieu (Uint32), population (Int32), type (Uint8 : 0 code postal,
//                  1 nom, 2 alias), puis sur 24 bits le rang du code postal dans le lieu (type 0) ou le rang
//                  global de l'alias dans les fichiers (type 2) — ordre des ex æquo identique à la recherche en
//                  mémoire, qui garde les alias dans l'ordre des fichiers
//
// RECHERCHE — mêmes règles que searchCommunes (lib/trip-engine.js), qui reste le repli si l'index est absent
// ou périmé : saisie normalisée ; au moins 3 caractères (ou exactement 2 idéographiques, noms et alias
// seulement) ; toutes les entrées dont la clé commence par la saisie (deux dichotomies sur keys.bin) ; tri par
// population décroissante puis type (code postal, nom, alias) puis ordre des lieux ; un seul code postal par
// lieu ; dédoublonnage par pays + nom normalisé + code ; `limit` résultats.
'use strict';
const fs = require('fs');
const path = require('path');

const VERSION = 2;
const ENTRY_SIZE = 12;
const TYPE_CP = 0, TYPE_NAME = 1, TYPE_ALIAS = 2;
const DATA_FILE_RE = /^(communes(?:-[a-z]{2})?|aliases-[a-z]{2})\.txt$/;

// Signature des fichiers de données : l'index n'est utilisé que s'il a été construit à partir des fichiers
// actuellement présents (sinon, repli sur la recherche en mémoire du moteur).
function dataSignature(dataDir){
  return fs.readdirSync(dataDir).filter(function(f){ return DATA_FILE_RE.test(f); }).sort().map(function(f){
    var st = fs.statSync(path.join(dataDir, f));
    return f + ':' + st.size + ':' + Math.floor(st.mtimeMs);
  }).join('|');
}

// ---------------------------------------------------------------------------------------------------------
// CONSTRUCTION (scripts/build-search-index.js)
// ---------------------------------------------------------------------------------------------------------
// Mémoire bornée pour tenir dans les limites de "Run NPM Install" sur l'hébergement mutualisé : les lieux sont
// lus pays par pays ; les entrées sont d'abord réparties dans des fichiers temporaires selon les deux premiers
// octets de leur clé, puis chaque fichier est trié seul et ajouté dans l'ordre — ce qui donne l'ordre global.
function build(dataDir, outDir, engineInternals, log){
  log = log || function(){};
  var normalize = engineInternals.normalizeCityName;
  var tmpDir = path.join(outDir, 'tmp');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  var signature = dataSignature(dataDir);

  var placesFd = fs.openSync(path.join(outDir, 'places.dat'), 'w');
  var placeOffFd = fs.openSync(path.join(outDir, 'placeoff.bin'), 'w');
  var placeBytes = 0, placeCount = 0, entryCount = 0;
  // Lignes en attente par fichier temporaire, écrites par paquets (un seul appel disque par fichier et par paquet).
  var shards = {}, pending = 0;
  function flushShards(){
    Object.keys(shards).forEach(function(name){
      fs.appendFileSync(path.join(tmpDir, 'shard-' + name + '.txt'), shards[name].join('\n') + '\n', 'latin1');
    });
    shards = {}; pending = 0;
  }
  function clean(s){ return String(s).replace(/[\t\n\r]/g, ' '); }
  function u32(n){ var b = Buffer.allocUnsafe(4); b.writeUInt32LE(n, 0); return b; }

  var communeFiles = fs.readdirSync(dataDir).filter(function(f){ return /^communes(?:-[a-z]{2})?\.txt$/.test(f); });
  // Lecture LIGNE PAR LIGNE, sans construire d'objet par lieu (même découpage et même normalisation que
  // parseCommunesFile / parseAliasesOfCountry dans lib/trip-engine.js) : seuls restent en mémoire, pour le pays en
  // cours, les numéros et populations des lieux par nom, nécessaires pour rattacher les alias.
  function pad(n, w){ var s = String(n); while(s.length < w) s = '0' + s; return s; }
  // Ligne temporaire « clé \t type \t lieu (9 chiffres) \t rang du code (5 chiffres) \t population » : les champs
  // d'ordre étant à largeur fixe et la tabulation inférieure à tout caractère de clé, le tri des LIGNES brutes donne
  // directement l'ordre voulu (clé, type, lieu, rang du code), sans créer d'objets.
  function addEntry(key, type, placeId, cpIdx, pop){
    if(!key) return;
    var bytes = Buffer.from(clean(key), 'utf8').toString('latin1'); // comparaison de chaînes = comparaison d'octets
    // Fichier temporaire choisi par les DEUX premiers octets de la clé : lots plus petits à trier en mémoire.
    var shard = pad(bytes.charCodeAt(0), 3) + '-' + pad(bytes.length > 1 ? bytes.charCodeAt(1) : 0, 3);
    (shards[shard] = shards[shard] || []).push(bytes + '\t' + type + '\t' + pad(placeId, 9) + '\t' + pad(cpIdx, 8) + '\t' + pop);
    entryCount++;
    if(++pending >= 500000) flushShards();
  }
  function eachLine(raw, fn){
    var pos = 0;
    while(pos < raw.length){
      var nl = raw.indexOf('\n', pos);
      if(nl < 0) nl = raw.length;
      if(nl > pos) fn(raw.slice(pos, nl));
      pos = nl + 1;
    }
  }
  var placeLines = [], placeOffBuf = [];
  function flushPlaces(){
    if(!placeLines.length) return;
    fs.writeSync(placesFd, placeLines.join(''));
    var offBuf = Buffer.allocUnsafe(placeOffBuf.length * 4);
    for(var i = 0; i < placeOffBuf.length; i++) offBuf.writeUInt32LE(placeOffBuf[i], i * 4);
    fs.writeSync(placeOffFd, offBuf);
    placeLines = []; placeOffBuf = [];
  }

  var countriesDone = 0, aliasSeq = 0;
  communeFiles.forEach(function(f){
    var m = f.match(/^communes(?:-([a-z]{2}))?\.txt$/);
    var cc = m[1] ? m[1].toUpperCase() : 'FR';
    var idsByName = new Map(), popById = {};
    var raw = fs.readFileSync(path.join(dataDir, f), 'utf8');
    eachLine(raw, function(line){
      var parts = line.split(';');
      var pop = parseInt(parts[0], 10) || 0;
      var latlon = parts[1].split(',');
      var lon = parseFloat(latlon[0]), lat = parseFloat(latlon[1]);
      var cps = parts[2].split(',');
      var dept = parts[3], name = parts[4];
      var norm = normalize(name);
      var placeId = placeCount++;
      var placeLine = [cc, clean(norm), clean(name), cps.map(clean).join(','), pop, lat, lon, clean(dept || '')].join('\t') + '\n';
      placeOffBuf.push(placeBytes);
      placeBytes += Buffer.byteLength(placeLine, 'utf8');
      placeLines.push(placeLine);
      if(placeLines.length >= 100000) flushPlaces();
      addEntry(norm, TYPE_NAME, placeId, 0, pop);
      for(var i = 0; i < cps.length; i++) addEntry(cps[i].toLowerCase(), TYPE_CP, placeId, i, pop);
      var ids = idsByName.get(name);
      if(ids) ids.push(placeId); else idsByName.set(name, [placeId]);
      popById[placeId] = pop;
    });
    raw = null;
    var aliasCount = 0;
    var aliasPath = path.join(dataDir, 'aliases-' + cc.toLowerCase() + '.txt');
    if(cc !== 'FR' && fs.existsSync(aliasPath)){
      eachLine(fs.readFileSync(aliasPath, 'utf8'), function(line){
        var parts = line.split(';');
        var alias = parts[1], canonical = parts[2];
        if(!alias || !canonical) return;
        var targets = idsByName.get(canonical);
        if(!targets) return;
        var norm = normalize(alias);
        for(var i = 0; i < targets.length; i++){ addEntry(norm, TYPE_ALIAS, targets[i], aliasSeq++, popById[targets[i]]); aliasCount++; }
      });
    }
    flushPlaces();
    countriesDone++;
    log(cc + ' : ' + aliasCount + ' alias');
  });
  flushShards();
  fs.writeSync(placeOffFd, u32(placeBytes));
  fs.closeSync(placesFd);
  fs.closeSync(placeOffFd);

  var keysFd = fs.openSync(path.join(outDir, 'keys.bin'), 'w');
  var keyOffFd = fs.openSync(path.join(outDir, 'keyoff.bin'), 'w');
  var entryFd = fs.openSync(path.join(outDir, 'entry.bin'), 'w');
  var keyBytes = 0, written = 0;
  // Noms de fichiers « octet1-octet2 » à largeur fixe : l'ordre alphabétique des noms est l'ordre des octets.
  var shardFiles = fs.readdirSync(tmpDir).filter(function(f){ return /^shard-\d{3}-\d{3}\.txt$/.test(f); }).sort();
  for(var si = 0; si < shardFiles.length; si++){
    var shardPath = path.join(tmpDir, shardFiles[si]);
    var rows = fs.readFileSync(shardPath, 'latin1').split('\n');
    if(rows.length && rows[rows.length - 1] === '') rows.pop();
    rows.sort();
    var keyChunks = [], keyOff = Buffer.allocUnsafe(rows.length * 4), entries = Buffer.alloc(rows.length * ENTRY_SIZE);
    rows.forEach(function(line, i){
      var p = line.split('\t');
      var kb = Buffer.from(p[0], 'latin1');
      keyOff.writeUInt32LE(keyBytes, i * 4);
      keyBytes += kb.length;
      keyChunks.push(kb);
      var o = i * ENTRY_SIZE;
      entries.writeUInt32LE(+p[2], o);
      entries.writeInt32LE(Math.min(+p[4], 2147483647), o + 4);
      entries.writeUInt8(+p[1], o + 8);
      var sub = Math.min(+p[3], 16777215);
      entries.writeUInt16LE(sub & 0xffff, o + 9);
      entries.writeUInt8(sub >>> 16, o + 11);
    });
    fs.writeSync(keysFd, Buffer.concat(keyChunks));
    fs.writeSync(keyOffFd, keyOff);
    fs.writeSync(entryFd, entries);
    written += rows.length;
    fs.unlinkSync(shardPath);
  }
  fs.writeSync(keyOffFd, u32(keyBytes));
  fs.closeSync(keysFd); fs.closeSync(keyOffFd); fs.closeSync(entryFd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if(written !== entryCount) throw new Error('entrées écrites ' + written + ' ≠ entrées produites ' + entryCount);
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ version: VERSION, signature: signature, entries: entryCount, places: placeCount }));
  return { entries: entryCount, places: placeCount };
}

// ---------------------------------------------------------------------------------------------------------
// LECTURE (server.js)
// ---------------------------------------------------------------------------------------------------------
function open(outDir, dataDir, engineInternals){
  var meta;
  try { meta = JSON.parse(fs.readFileSync(path.join(outDir, 'meta.json'), 'utf8')); } catch(e){ return null; }
  if(meta.version !== VERSION) return null;
  if(meta.signature !== dataSignature(dataDir)) return null;
  var fds = {};
  ['places.dat', 'placeoff.bin', 'keys.bin', 'keyoff.bin', 'entry.bin'].forEach(function(f){ fds[f] = fs.openSync(path.join(outDir, f), 'r'); });
  var normalize = engineInternals.normalizeCityName;
  var IDEOGRAPHIC_RE = engineInternals.IDEOGRAPHIC_RE;
  var n = meta.entries;

  function readBuf(fd, pos, len){ var b = Buffer.allocUnsafe(len); var got = fs.readSync(fd, b, 0, len, pos); return got === len ? b : b.subarray(0, got); }
  function keyOffset(i){ return readBuf(fds['keyoff.bin'], i * 4, 4).readUInt32LE(0); }
  function keyAt(i){ var a = keyOffset(i), z = keyOffset(i + 1); return readBuf(fds['keys.bin'], a, z - a); }
  // Première entrée dont la clé est >= q (octets), ou dont la clé est > tout ce qui commence par q (upper).
  function lowerBound(q){
    var lo = 0, hi = n;
    while(lo < hi){ var mid = (lo + hi) >>> 1; if(Buffer.compare(keyAt(mid), q) < 0) lo = mid + 1; else hi = mid; }
    return lo;
  }
  function upperBoundPrefix(q, from){
    var lo = from, hi = n;
    while(lo < hi){
      var mid = (lo + hi) >>> 1, k = keyAt(mid);
      var cmp = Buffer.compare(k.subarray(0, q.length), q);
      if(cmp <= 0) lo = mid + 1; else hi = mid;
    }
    return lo;
  }
  function placeAt(id){
    var off = readBuf(fds['placeoff.bin'], id * 4, 8);
    var a = off.readUInt32LE(0), z = off.readUInt32LE(4);
    var p = readBuf(fds['places.dat'], a, z - a).toString('utf8').replace(/\n$/, '').split('\t');
    return { country: p[0], norm: p[1], name: p[2], cps: p[3].split(','), pop: +p[4], lat: +p[5], lon: +p[6], dept: p[7] };
  }

  function search(query, limit){
    var q = normalize(query);
    var shortIdeographic = q.length === 2 && IDEOGRAPHIC_RE.test(q);
    if(q.length < 3 && !shortIdeographic) return [];
    var qb = Buffer.from(q, 'utf8');
    var lo = lowerBound(qb), hi = upperBoundPrefix(qb, lo);
    if(hi <= lo) return [];
    var count = hi - lo;
    var raw = readBuf(fds['entry.bin'], lo * ENTRY_SIZE, count * ENTRY_SIZE);
    var cands = new Array(count);
    for(var i = 0; i < count; i++){
      var o = i * ENTRY_SIZE;
      cands[i] = { place: raw.readUInt32LE(o), pop: raw.readInt32LE(o + 4), type: raw.readUInt8(o + 8), cp: raw.readUInt16LE(o + 9) + (raw.readUInt8(o + 11) << 16) };
    }
    if(shortIdeographic) cands = cands.filter(function(c){ return c.type !== TYPE_CP; });
    // Ex æquo : codes postaux puis noms dans l'ordre des lieux, alias dans l'ordre des fichiers (rang global).
    function order(x, y){
      return (y.pop - x.pop) || (x.type - y.type) || (x.type === TYPE_ALIAS ? x.cp - y.cp : (x.place - y.place) || (x.cp - y.cp));
    }
    // Saisie très courante (« san », « bel »…) : des dizaines de milliers d'entrées. On ne trie que les meilleures
    // (sélection par tas) ; si le dédoublonnage ne laisse pas assez de résultats, tri complet en repli.
    var TOP = Math.max(64, limit * 8);
    var ordered = cands.length > TOP * 4 ? topK(cands, TOP, order) : cands.sort(order);
    var result = collect(ordered);
    if(result.length < limit && ordered.length < cands.length) result = collect(cands.sort(order));
    return result;

    function collect(list){
    var out = [], seen = {}, cpMatched = {}, places = {};
    for(var j = 0; j < list.length && out.length < limit; j++){
      var c = list[j];
      var pl = places[c.place] || (places[c.place] = placeAt(c.place));
      var cp = c.type === TYPE_CP ? pl.cps[c.cp] : pl.cps[0];
      if(c.type === TYPE_CP){
        var ckey = pl.country + '|' + pl.norm;
        if(cpMatched[ckey]) continue;
        cpMatched[ckey] = true;
      }
      var key = pl.country + '|' + pl.norm + '|' + cp;
      if(seen[key]) continue;
      seen[key] = true;
      out.push({ name: pl.name, cp: cp, allCps: pl.cps, pop: pl.pop, lat: pl.lat, lon: pl.lon, dept: pl.dept, country: pl.country });
    }
    return out;
    }
  }
  return { search: search, entries: meta.entries, places: meta.places };
}

// Les k premiers éléments de list selon order (tas binaire de taille k, dont la racine est le moins bon retenu),
// renvoyés triés.
function topK(list, k, order){
  var heap = [];
  function worse(i, j){ return order(heap[i], heap[j]) > 0; }
  function swap(i, j){ var t = heap[i]; heap[i] = heap[j]; heap[j] = t; }
  function up(i){ while(i > 0){ var p = (i - 1) >> 1; if(worse(i, p)){ swap(i, p); i = p; } else break; } }
  function down(i){
    for(;;){
      var l = 2 * i + 1, r = l + 1, w = i;
      if(l < heap.length && worse(l, w)) w = l;
      if(r < heap.length && worse(r, w)) w = r;
      if(w === i) return;
      swap(i, w); i = w;
    }
  }
  for(var i = 0; i < list.length; i++){
    if(heap.length < k){ heap.push(list[i]); up(heap.length - 1); }
    else if(order(list[i], heap[0]) < 0){ heap[0] = list[i]; down(0); }
  }
  return heap.sort(order);
}

module.exports = { build: build, open: open, dataSignature: dataSignature };
