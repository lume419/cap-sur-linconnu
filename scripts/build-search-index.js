// Construit l'index de recherche de ville précalculé (cache/search-index/, voir lib/search-index.js) à partir des
// fichiers public/data/communes*.txt et aliases-*.txt. Lancé au déploiement par `npm install` (postinstall) et
// par `npm run build-bundles`, après scripts/build-data-bundles.js : à relancer après tout ajout ou modification
// de pays (sinon le serveur détecte un index périmé et revient à la recherche en mémoire, plus lente au
// démarrage). Échec non bloquant pour npm install (voir package.json).
const path = require('path');
const searchIndex = require('../lib/search-index.js');
const tripEngine = require('../lib/trip-engine.js');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const OUT_DIR = path.join(__dirname, '..', 'cache', 'search-index');

try {
  const t0 = Date.now();
  let lines = 0;
  const res = searchIndex.build(DATA_DIR, OUT_DIR, tripEngine.internals, function(){ lines++; });
  const mem = process.memoryUsage();
  console.log('[build-search-index] ' + res.places + ' lieux, ' + res.entries + ' entrées (' + lines + ' fichiers de pays) en '
    + Math.round((Date.now() - t0) / 1000) + ' s — mémoire max ' + Math.round(mem.rss / 1048576) + ' Mo.');
} catch(err){
  console.error('[build-search-index] ÉCHEC : ' + err.message);
  console.error('[build-search-index] Le serveur utilisera la recherche en mémoire (disponible après chargement du moteur).');
  process.exitCode = 1;
}
