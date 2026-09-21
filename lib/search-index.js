// Index de recherche de ville précalculé sur disque (septembre 2026).
//
// POURQUOI — avec ~4 millions de lieux, le moteur (lib/trip-engine.js) met de longues secondes à se
// charger au démarrage du serveur ; sur l'hébergement mutualisé, qui arrête l'application après une période
// sans visite, chaque premier visiteur voyait « Chargement des communes… » pendant plus d'une minute. Cet
// index est construit UNE fois au déploiement (scripts/build-search-index.js, lancé par `npm install`) et lu
// directement sur le disque : la recherche répond dès la première seconde, sans rien charger en mémoire.
//
// FORMAT (dossier cache/search-index/, jamais commité) :
//   meta.json      version, signature des fichiers de données ET du normalisateur de noms (taille + date de chaque communes*.txt /
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
//   aliases.dat    (version 3) texte des alias, une ligne « langue \t alias » par rang global d'alias : affiché
//                  entre parenthèses quand la saisie correspond à un nom alternatif (« Xanten (Santen) »)
//   aliasoff.bin   Uint32 LE × (rangs + 1) : position de chaque ligne de aliases.dat
//   countries.json (facultatif, sans changement de version) plages de numéros de lieux par pays { "FR": [début, fin[ } —
//                  écrit à la construction ; absent d'un index plus ancien, il est calculé à l'ouverture puis enregistré
//
// RECHERCHE — mêmes règles que searchCommunes (lib/trip-engine.js), qui reste le repli si l'index est absent
// ou périmé : saisie normalisée ; au moins 3 caractères (ou exactement 2 idéographiques, noms et alias
// seulement) ; toutes les entrées dont la clé commence par la saisie (deux dichotomies sur keys.bin) ; tri par
// population décroissante puis type (code postal, nom, alias) puis ordre des lieux ; un seul code postal par
// lieu ; dédoublonnage par pays + nom normalisé + code ; `limit` résultats. Pays prioritaire (langue d'interface) :
// ses lieux passent avant les autres, qui gardent quelques places (mergePreferred). Les lieux d'un pays occupent des
// numéros CONSÉCUTIFS dans places.dat (un fichier de pays à la fois à la construction) : la plage de chaque pays se
// retrouve par dichotomie à l'ouverture, sans lire tout le fichier ni reconstruire l'index.
'use strict';
const fs = require('fs');
const path = require('path');

const VERSION = 3;
const ENTRY_SIZE = 12;
const TYPE_CP = 0, TYPE_NAME = 1, TYPE_ALIAS = 2;
const COUNTRY_RANGES_FILE = 'countries.json';
const DATA_FILE_RE = /^(communes(?:-[a-z]{2})?|aliases-[a-z]{2})\.txt$/;

// Signature des fichiers de données : l'index n'est utilisé que s'il a été construit à partir des fichiers
// actuellement présents (sinon, repli sur la recherche en mémoire du moteur).
// Empreinte du NORMALISATEUR de noms (17e audit du 20/09/2026). La signature ci-dessus ne regarde que les fichiers de
// données : au 16e audit, normalizeCityName a changé (retrait des liants U+200C/U+200D) SANS qu'un fichier bouge, donc
// l'index déjà construit restait « valide » alors que ses clés ne correspondaient plus aux requêtes — 3 416 alias
// persans, ourdous et bengalis sont devenus introuvables, sans le moindre avertissement. L'empreinte est calculée sur
// un échantillon qui traverse toutes les règles du normalisateur (liants, accents, ligature, tiret, apostrophe,
// espaces, idéogrammes, casse) : toute modification de la fonction change l'empreinte et l'index est reconstruit.
// 18e audit du 21/09/2026 : l'échantillon ne contenait que l'apostrophe droite et le trait d'union, les deux seuls
// séparateurs d'alors ; il a été élargi pour que l'index déjà construit ne soit pas pris pour valide — exactement le
// défaut que cette empreinte a été écrite pour empêcher. 19e audit : le commentaire affirmait qu'il traversait
// « toute la famille élargie », ce qui était faux — 4 caractères sur 27, et pas U+2019, le plus fréquent (73 761
// lieux). L'échantillon couvre maintenant CHAQUE caractère de SEP_RE et de NORM_DROP_RE (sonde « famille »), pour
// qu'une modification future de l'un d'eux change l'empreinte.
const NORM_PROBE = ['سوم\u200cدره', 'Œuf-d\'Ange', 'Sainte-Foy', 'ÉLAN  élan', 'İzmir', '北京', 'cn-15', 'Ye\u200brushalayim',
  'Chervonyy Donets\u2018', 'T\u0060lminci', 'Nago\u2013Torbole', 'Compostel\u00B7la', '\u0645\u064E\u0627\u064E\u0644\u0642\u064E\u0629',
  // Un « a » entre chaque caractère de SEP_RE et de NORM_DROP_RE, les 34 (19e audit du 21/09/2026) :
  // retirer n'importe lequel des deux jeux change cette empreinte, donc invalide l'index déjà construit.
  'a\u002Da\u0027a\u0060a\u00B4a\u02B9a\u02BBa\u02BCa\u02BEa\u02BFa\u02C8a\u0384a\u05F3a\u2018a\u2019a\u201Ba\u2010a\u2011a\u2012a\u2013a\u2014a\u2015a\uFF0Da\u00B7a\u2027a\u0640a\u064Ba\u064Ca\u064Da\u064Ea\u064Fa\u0650a\u0651a\u0652a\u0670a'];
function normSignature(engineInternals){
  var f = engineInternals && engineInternals.normalizeCityName;
  if(typeof f !== 'function') return '';
  return NORM_PROBE.map(function(x){ return f(x); }).join('\u0001');
}
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
// fs.writeSync n'écrit pas forcément tout le tampon d'un coup (disque plein, signal, hébergement mutualisé) et sa
// valeur de retour était ignorée : un index silencieusement tronqué, dont les décalages ne pointaient plus au bon
// endroit (7e audit). writeAll boucle jusqu'au dernier octet.
function writeAll(fd, data){
  var buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  var off = 0;
  while(off < buf.length){
    var n = fs.writeSync(fd, buf, off, buf.length - off);
    if(!(n > 0)) throw new Error('écriture bloquée à ' + off + '/' + buf.length + ' octets');
    off += n;
  }
}
function build(dataDir, finalDir, engineInternals, log){
  log = log || function(){};
  // Construit dans un dossier temporaire puis le renomme : un serveur ne lit jamais un index à moitié écrit.
  var outDir = finalDir + '.tmp';
  var normalize = engineInternals.normalizeCityName;
  var tmpDir = path.join(outDir, 'tmp');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  var signature = dataSignature(dataDir);

  var placesFd = fs.openSync(path.join(outDir, 'places.dat'), 'w');
  var placeOffFd = fs.openSync(path.join(outDir, 'placeoff.bin'), 'w');
  var placeBytes = 0, placeCount = 0, entryCount = 0;
  var aliasTextFd = fs.openSync(path.join(outDir, 'aliases.dat'), 'w');
  var aliasOffFd = fs.openSync(path.join(outDir, 'aliasoff.bin'), 'w');
  var aliasBytes = 0, aliasLines = [], aliasOffBuf = [];
  function flushAliasTexts(){
    if(!aliasLines.length) return;
    writeAll(aliasTextFd, aliasLines.join(''));
    var offBuf = Buffer.allocUnsafe(aliasOffBuf.length * 4);
    for(var i = 0; i < aliasOffBuf.length; i++) offBuf.writeUInt32LE(aliasOffBuf[i], i * 4);
    writeAll(aliasOffFd, offBuf);
    aliasLines = []; aliasOffBuf = [];
  }
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
    writeAll(placesFd, placeLines.join(''));
    var offBuf = Buffer.allocUnsafe(placeOffBuf.length * 4);
    for(var i = 0; i < placeOffBuf.length; i++) offBuf.writeUInt32LE(placeOffBuf[i], i * 4);
    writeAll(placeOffFd, offBuf);
    placeLines = []; placeOffBuf = [];
  }

  var countriesDone = 0, aliasSeq = 0, countryRangesBuilt = {};
  communeFiles.forEach(function(f){
    var m = f.match(/^communes(?:-([a-z]{2}))?\.txt$/);
    var cc = m[1] ? m[1].toUpperCase() : 'FR';
    var firstPlace = placeCount;
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
    // France comprise depuis septembre 2026 (aliases-fr.txt, scripts/build-all-aliases.js).
    if(fs.existsSync(aliasPath)){
      eachLine(fs.readFileSync(aliasPath, 'utf8'), function(line){
        var parts = line.split(';');
        var alias = parts[1], canonical = parts[2];
        if(!alias || !canonical) return;
        var targets = idsByName.get(canonical);
        if(!targets) return;
        var norm = normalize(alias);
        var aliasLine = clean(parts[0] || '') + '\t' + clean(alias) + '\n';
        for(var i = 0; i < targets.length; i++){
          aliasOffBuf.push(aliasBytes);
          aliasBytes += Buffer.byteLength(aliasLine, 'utf8');
          aliasLines.push(aliasLine);
          addEntry(norm, TYPE_ALIAS, targets[i], aliasSeq++, popById[targets[i]]); aliasCount++;
        }
        if(aliasLines.length >= 100000) flushAliasTexts();
      });
    }
    flushPlaces();
    if(placeCount > firstPlace) countryRangesBuilt[cc] = [firstPlace, placeCount];
    countriesDone++;
    log(cc + ' : ' + aliasCount + ' alias');
  });
  flushShards();
  writeAll(placeOffFd, u32(placeBytes));
  fs.closeSync(placesFd);
  fs.closeSync(placeOffFd);
  flushAliasTexts();
  writeAll(aliasOffFd, u32(aliasBytes));
  fs.closeSync(aliasTextFd);
  fs.closeSync(aliasOffFd);

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
    writeAll(keysFd, Buffer.concat(keyChunks));
    writeAll(keyOffFd, keyOff);
    writeAll(entryFd, entries);
    written += rows.length;
    fs.unlinkSync(shardPath);
  }
  writeAll(keyOffFd, u32(keyBytes));
  fs.closeSync(keysFd); fs.closeSync(keyOffFd); fs.closeSync(entryFd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if(written !== entryCount) throw new Error('entrées écrites ' + written + ' ≠ entrées produites ' + entryCount);
  fs.writeFileSync(path.join(outDir, COUNTRY_RANGES_FILE), JSON.stringify(countryRangesBuilt));
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ version: VERSION, signature: signature,
    normSignature: normSignature(engineInternals), entries: entryCount, places: placeCount }));
  fs.rmSync(finalDir, { recursive: true, force: true });
  fs.renameSync(outDir, finalDir);
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
  // Index construit avec un autre normalisateur : inutilisable (voir normSignature).
  if(meta.normSignature !== normSignature(engineInternals)) return null;
  if(!(meta.entries > 0) || !(meta.places > 0)) return null;
  var fds = {};
  ['places.dat', 'placeoff.bin', 'keys.bin', 'keyoff.bin', 'entry.bin', 'aliases.dat', 'aliasoff.bin'].forEach(function(f){ fds[f] = fs.openSync(path.join(outDir, f), 'r'); });
  // Tailles vérifiées à l'ouverture (7e audit) : un index tronqué (disque plein, copie interrompue, construction tuée)
  // passait inaperçu — les décalages lus en dehors du fichier donnaient des lieux vides ou des noms coupés, sans erreur.
  // La signature de meta.json ne dit rien de l'intégrité des 7 fichiers. En cas d'incohérence, tout est refermé et
  // l'appelant (server.js) reconstruit l'index.
  try {
    var sizeOf = function(f){ return fs.fstatSync(fds[f]).size; };
    var expect = function(f, want){ var got = sizeOf(f); if(got !== want) throw new Error(f + ' : ' + got + ' octets au lieu de ' + want); };
    expect('keyoff.bin', (meta.entries + 1) * 4);
    expect('entry.bin', meta.entries * ENTRY_SIZE);
    expect('placeoff.bin', (meta.places + 1) * 4);
    var lastOff = function(f, dataFile){
      var b = Buffer.allocUnsafe(4);
      fs.readSync(fds[f], b, 0, 4, sizeOf(f) - 4);
      var end = b.readUInt32LE(0);
      if(sizeOf(dataFile) !== end) throw new Error(dataFile + ' : ' + sizeOf(dataFile) + ' octets, ' + end + ' attendus');
    };
    lastOff('keyoff.bin', 'keys.bin');
    lastOff('placeoff.bin', 'places.dat');
    var aliasOffSize = sizeOf('aliasoff.bin');
    if(aliasOffSize % 4 !== 0 || aliasOffSize < 4) throw new Error('aliasoff.bin : ' + aliasOffSize + ' octets');
    lastOff('aliasoff.bin', 'aliases.dat');
  } catch(err){
    Object.keys(fds).forEach(function(f){ try { fs.closeSync(fds[f]); } catch(e){} });
    throw new Error('index de recherche incohérent (' + err.message + ')');
  }
  var normalize = engineInternals.normalizeCityName;
  var IDEOGRAPHIC_RE = engineInternals.IDEOGRAPHIC_RE;
  var n = meta.entries;

  // Lecture courte : refusée plutôt que tronquée en silence — un décalage aberrant produisait un nom coupé au lieu d'une
  // erreur visible. Les tailles étant vérifiées ci-dessus, cela ne devrait plus arriver qu'en cas de fichier modifié
  // sous le serveur (reconstruction pendant qu'il tourne).
  function readBuf(fd, pos, len){
    if(!(len >= 0) || !(pos >= 0)) throw new Error('lecture index hors bornes (' + pos + ', ' + len + ')');
    var b = Buffer.allocUnsafe(len);
    var got = fs.readSync(fd, b, 0, len, pos);
    if(got !== len) throw new Error('lecture index incomplète (' + got + '/' + len + ' octets à ' + pos + ')');
    return b;
  }
  // Début et fin de la clé lus en une seule lecture (deux appels disque par clé au lieu de trois dans les dichotomies).
  function keyAt(i){ var off = readBuf(fds['keyoff.bin'], i * 4, 8); var a = off.readUInt32LE(0), z = off.readUInt32LE(4); return readBuf(fds['keys.bin'], a, z - a); }
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

  // Plages de numéros de lieux par pays : lues dans countries.json, sinon calculées DÈS L'OUVERTURE (et enregistrées pour
  // les démarrages suivants) — calculées au premier appel avec un pays, elles bloquaient cette recherche ~2,6 s. Calcul :
  // pour chaque bloc, recherche exponentielle puis dichotomie de la fin du bloc (2 premiers octets de quelques lignes).
  var countryRanges = null;
  function ccAt(id){
    var a = readBuf(fds['placeoff.bin'], id * 4, 4).readUInt32LE(0);
    return readBuf(fds['places.dat'], a, 2).toString('latin1');
  }
  function rangesByCountry(){
    if(countryRanges) return countryRanges;
    var ranges = {}, total = meta.places, start = 0;
    while(start < total){
      var cc = ccAt(start), step = 1, lo = start, hi;
      while(start + step < total && ccAt(start + step) === cc){ lo = start + step; step *= 2; }
      hi = Math.min(start + step, total);
      while(hi - lo > 1){ var mid = (lo + hi) >>> 1; if(ccAt(mid) === cc) lo = mid; else hi = mid; }
      ranges[cc] = [start, lo + 1];
      start = lo + 1;
    }
    return (countryRanges = ranges);
  }
  try {
    var saved = JSON.parse(fs.readFileSync(path.join(outDir, COUNTRY_RANGES_FILE), 'utf8'));
    if(saved && typeof saved === 'object' && !Array.isArray(saved)) countryRanges = saved;
  } catch(e){ /* absent ou illisible : calculé ci-dessous */ }
  if(!countryRanges){
    rangesByCountry();
    try { fs.writeFileSync(path.join(outDir, COUNTRY_RANGES_FILE), JSON.stringify(countryRanges)); } catch(e){ /* dossier en lecture seule : recalcul au prochain démarrage */ }
  }

  // Texte d'un alias par son rang global : { lang, text }.
  function aliasAt(seq){
    var off = readBuf(fds['aliasoff.bin'], seq * 4, 8);
    var a = off.readUInt32LE(0), z = off.readUInt32LE(4);
    var p = readBuf(fds['aliases.dat'], a, z - a).toString('utf8').replace(/\n$/, '').split('\t');
    return { lang: p[0], text: p[1] };
  }

  // lang : langue d'interface — quand plusieurs noms alternatifs d'un même lieu correspondent à la saisie, celui de
  // cette langue est affiché de préférence (« San Petersburgo » en espagnol, « Sankt Petersburg » en allemand).
  function search(query, limit, preferCountry, lang){
    var q = normalize(query);
    var rawQuery = String(query).trim().toLowerCase();
    var pref = preferCountry ? rangesByCountry()[preferCountry] : null;
    function preferred(c){ return pref && c.place >= pref[0] && c.place < pref[1]; }
    var shortIdeographic = q.length === 2 && IDEOGRAPHIC_RE.test(q);
    // Code postal à tiret (« cn-1… ») : sa forme normalisée (« cn 1 ») peut être courte ; voir le repli plus bas.
    if(q.length < 3 && !shortIdeographic && !(rawQuery.indexOf('-') >= 0 && rawQuery.length >= 3)) return [];
    var rawOnly = q.length < 3 && !shortIdeographic; // forme normalisée trop courte : seule la saisie brute est cherchée
    var qb = Buffer.from(rawOnly ? rawQuery : q, 'utf8');
    var lo = lowerBound(qb), hi = upperBoundPrefix(qb, lo);
    // Codes postaux à tiret (« cn-110000 », « pk-… » : ~1 million d'entrées, 10e audit du 18/09/2026) : ils sont indexés
    // tels quels (en minuscules), alors que la saisie normalisée remplace le tiret par une espace — aucun ne pouvait être
    // trouvé. Seconde recherche avec la saisie brute, seulement si la première ne donne rien.
    if(hi <= lo && !rawOnly && rawQuery !== q && rawQuery.indexOf('-') >= 0 && rawQuery.length >= 3){
      qb = Buffer.from(rawQuery, 'utf8');
      lo = lowerBound(qb); hi = upperBoundPrefix(qb, lo);
    }
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
    function best(list){
      var ordered = list.length > TOP * 4 ? topK(list, TOP, order) : list.slice().sort(order);
      var result = collect(ordered);
      if(result.length < limit && ordered.length < list.length) result = collect(list.slice().sort(order));
      return result;
    }
    if(!pref) return best(cands);
    // Pays prioritaire : ses lieux en tête, sans exclure les autres (voir mergePreferred).
    return mergePreferred(best(cands.filter(function(c){ return preferred(c); })),
      best(cands.filter(function(c){ return !preferred(c); })), limit);

    function collect(list){
    var out = [], seen = {}, cpMatched = {}, places = {}, lastPlace = -1;
    // Après la dernière place remplie, on lit encore les entrées du même lieu (alias contigus : même population,
    // même type) pour pouvoir choisir le nom alternatif dans la langue d'interface.
    for(var j = 0; j < list.length && (out.length < limit || list[j].place === lastPlace); j++){
      var c = list[j];
      var pl = places[c.place] || (places[c.place] = placeAt(c.place));
      var cp = c.type === TYPE_CP ? pl.cps[c.cp] : pl.cps[0];
      if(c.type === TYPE_CP){
        var ckey = pl.country + '|' + pl.norm;
        if(cpMatched[ckey]) continue;
        cpMatched[ckey] = true;
      }
      var key = pl.country + '|' + pl.norm + '|' + cp;
      if(seen[key]){
        // Même lieu déjà retenu par un nom alternatif : les autres noms alternatifs qui correspondent sont candidats
        // (voir aliasScore). Un lieu retenu par son nom ou son code n'a pas de parenthèse.
        var prev = seen[key];
        if(c.type === TYPE_ALIAS && prev._alias){ var more = aliasAt(c.cp); offerAlias(prev, more.text, normalize(more.text), more.lang, rawQuery, q, lang); }
        continue;
      }
      var r = { name: pl.name, cp: cp, allCps: pl.cps, pop: pl.pop, lat: pl.lat, lon: pl.lon, dept: pl.dept, country: pl.country };
      if(c.type === TYPE_ALIAS){ var al = aliasAt(c.cp); offerAlias(r, al.text, normalize(al.text), al.lang, rawQuery, q, lang); }
      r._placeNorm = pl.norm;
      seen[key] = r;
      lastPlace = c.place;
      out.push(r);
    }
    return out.map(function(r){ var pn = r._placeNorm; delete r._placeNorm; return finishAlias(r, pn); });
    }
  }
  return { search: search, entries: meta.entries, places: meta.places };
}

// Proximité entre la langue d'un nom alternatif (code GeoNames) et la langue d'interface : 2 même code, 1 code
// équivalent (GeoNames range le chinois traditionnel sous zh-TW / zh-HK, le norvégien sous nb / nn, le papiamento sous
// pap, le kichwa sous qu / qug, le filipino sous tl, le normand sous nrf…), 0 sinon. Sert à choisir, parmi plusieurs
// noms alternatifs d'un lieu qui correspondent à la saisie, celui affiché entre parenthèses.
var ALIAS_LANG_EQUIV = {
  'zh-Hant': ['zh-TW', 'zh-HK', 'yue'], zh: ['zh-Hans', 'zh-CN'], no: ['nb', 'nn'], 'pap-AW': ['pap'], 'pap-CW': ['pap'],
  'qu-EC': ['qu', 'qug'], qu: ['quz'], fil: ['tl'], 'nrf-je': ['nrf'], 'nrf-gg': ['nrf'], ku: ['kmr'], fa: ['prs'],
  hsb: ['dsb'], sr: ['sr-Latn', 'hbs'], cnr: ['sr', 'sr-Latn', 'hbs'], bs: ['hbs'], hr: ['hbs']
};
function aliasLangRank(aliasLang, lang){
  if(!lang || !aliasLang) return 0;
  if(aliasLang === lang) return 2;
  var eq = ALIAS_LANG_EQUIV[lang];
  return eq && eq.indexOf(aliasLang) !== -1 ? 1 : 0;
}

// Choix du nom alternatif affiché entre parenthèses, parmi ceux d'un même lieu qui correspondent à la saisie : d'abord la
// langue d'interface (aliasLangRank), puis le nom tapé tel quel (casse ignorée), puis le nom tapé sans accents. Aucune
// parenthèse si le nom choisi figure déjà dans le nom du lieu (« Juan de Nova » pour « Île Juan de Nova ») — plutôt
// que d'afficher à sa place un nom d'une autre langue.
function aliasScore(text, norm, aliasLang, rawQuery, qNorm, lang){
  return aliasLangRank(aliasLang, lang) * 4 + (String(text).toLowerCase() === rawQuery ? 2 : 0) + (norm === qNorm ? 1 : 0);
}
function offerAlias(r, text, norm, aliasLang, rawQuery, qNorm, lang){
  var s = aliasScore(text, norm, aliasLang, rawQuery, qNorm, lang);
  if(!r._alias || s > r._alias.score) r._alias = { text: text, norm: norm, score: s };
}
function finishAlias(r, placeNorm){
  if(r._alias && placeNorm.indexOf(r._alias.norm) === -1) r.matchedName = r._alias.text;
  delete r._alias;
  return r;
}

// Suggestions avec un pays prioritaire (langue d'interface) : TOUS ses lieux d'abord (par population), puis, seulement
// s'il en reste la place, ceux des autres pays (par population). Mêmes règles pour la recherche en mémoire du moteur
// (lib/trip-engine.js). Jusqu'en septembre 2026, 3 des 8 places étaient réservées aux autres pays ; choix de l'utilisateur
// avec le passage à 20 suggestions : le pays de la langue d'abord, sans réserve.
function mergePreferred(preferredResults, otherResults, limit){
  var nPref = Math.min(preferredResults.length, limit);
  return preferredResults.slice(0, nPref).concat(otherResults.slice(0, limit - nPref));
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

module.exports = { normSignature: normSignature, build: build, open: open, dataSignature: dataSignature, mergePreferred: mergePreferred, aliasLangRank: aliasLangRank,
  offerAlias: offerAlias, finishAlias: finishAlias };
