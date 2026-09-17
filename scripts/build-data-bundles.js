// Précompile public/data/communes-bundle.txt et public/data/aliases-bundle.txt : concaténation des fichiers de pays
// (un marqueur ###XX### par fichier). server.js (loadRawBundleText) lit ce texte brut pour initialiser le moteur s'il
// est plus récent que tous les fichiers de données ; sinon il refait la même concaténation lui-même, plus lentement.
//
// Historique : ce script écrivait aussi des versions gzip et brotli (.txt.gz / .txt.br) servies par les routes
// /data/*-bundle.txt. Ces routes ont été retirées (audit de septembre 2026, voir server.js) et plus aucun code ne lit
// ces fichiers : la compression (~105 s et ~880 Mo de mémoire lors de « Run NPM Install ») est supprimée, et les
// anciens .gz/.br restés sur le disque sont effacés.
//
// Écriture ATOMIQUE (fichier .tmp puis renommage) : un processus tué en cours d'écriture ne laisse jamais un bundle
// tronqué plus récent que les données, que le serveur prendrait pour valide (il compare les dates de modification).
//
// Échec NON BLOQUANT pour npm install : voir "postinstall" dans package.json.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// Même format que buildBundleTextAsync dans server.js (code pays en majuscules, France identifiée par 'FR' faute de
// suffixe dans son nom de fichier) : les deux doivent rester synchronisés.
function buildBundleText(re, franceCode){
  return fs.readdirSync(DATA_DIR).filter(function(f){ return re.test(f); }).map(function(f){
    var m = f.match(re);
    var cc = (m[1] ? m[1].toUpperCase() : franceCode);
    return '###' + cc + '###\n' + fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
  }).join('\n');
}

function buildOne(name, re, franceCode){
  process.stdout.write('[build-data-bundles] ' + name + '... ');
  var t0 = Date.now();
  var target = path.join(DATA_DIR, name + '.txt');
  var tmp = target + '.tmp';
  try {
    var raw = buildBundleText(re, franceCode);
    fs.writeFileSync(tmp, raw, 'utf8');
    fs.renameSync(tmp, target);
  } catch(err){
    try { fs.unlinkSync(tmp); } catch(e){ /* rien à nettoyer */ }
    throw err;
  }
  // Anciennes versions compressées : plus lues par personne.
  ['.txt.gz', '.txt.br'].forEach(function(ext){ fs.rmSync(path.join(DATA_DIR, name + ext), { force: true }); });
  console.log(Buffer.byteLength(raw, 'utf8') + ' octets — ' + (Date.now() - t0) + ' ms');
}

try {
  buildOne('communes-bundle', /^communes(?:-([a-z]{2}))?\.txt$/, 'FR');
  buildOne('aliases-bundle', /^aliases-([a-z]{2})\.txt$/, '');
  var mem = process.memoryUsage();
  console.log('[build-data-bundles] terminé — relancer ce script après tout ajout/modification de pays. '
    + 'Mémoire (RSS) en fin de script : ' + Math.round(mem.rss / 1024 / 1024) + ' Mo.');
} catch(err){
  console.error('[build-data-bundles] ÉCHEC : ' + err.message);
  console.error('[build-data-bundles] Bundle absent ou ancien — server.js concatène alors les fichiers de données '
    + 'lui-même au démarrage (plus lent mais fonctionnel).');
  process.exitCode = 1;
}
