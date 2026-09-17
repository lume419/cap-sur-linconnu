// Construit l'index de recherche de ville précalculé (cache/search-index/, voir lib/search-index.js) à partir des
// fichiers public/data/communes*.txt et aliases-*.txt. Lancé au déploiement par `npm install` (postinstall) et
// par `npm run build-bundles`, après scripts/build-data-bundles.js : à relancer après tout ajout ou modification
// de pays (sinon le serveur détecte un index périmé et revient à la recherche en mémoire, plus lente au
// démarrage). Échec non bloquant pour npm install (voir package.json).
//
// Verrou partagé avec server.js (buildSearchIndexInChild) : cache/search-index.lock, contenu = PID du constructeur.
// Les deux écrivent dans le même dossier temporaire (cache/search-index.tmp) : jamais deux constructions à la fois.
// Quand le serveur lance ce script en processus enfant, il a déjà pris le verrou avec SON PID (process.ppid ici) :
// le script travaille alors sous ce verrou sans le recréer ni le retirer (le serveur le retire à la fin de l'enfant).
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const OUT_DIR = path.join(__dirname, '..', 'cache', 'search-index');
const LOCK = path.join(__dirname, '..', 'cache', 'search-index.lock');
const LOCK_MAX_AGE_MS = 30 * 60 * 1000; // même durée que server.js

// PID du verrou s'il désigne une construction en cours (verrou récent, processus vivant), sinon null.
function activeLockPid(){
  let st, pid;
  try {
    st = fs.statSync(LOCK);
    pid = parseInt(fs.readFileSync(LOCK, 'utf8'), 10);
  } catch(e){
    if(e.code === 'ENOENT') return null;
    throw e;
  }
  if(Date.now() - st.mtimeMs >= LOCK_MAX_AGE_MS) return null;
  // Verrou vide ou illisible : tout juste créé (PID pas encore écrit) pendant 5 s, comme côté serveur ; orphelin ensuite.
  if(!(pid > 0)) return Date.now() - st.mtimeMs < 5000 ? -1 : null;
  try { process.kill(pid, 0); return pid; } catch(e){ return e.code === 'EPERM' ? pid : null; }
}

// true : verrou pris par ce processus (à retirer à la fin) ; 'parent' : verrou du serveur parent ; false : occupé.
function acquireLock(){
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  for(let attempt = 0; attempt < 2; attempt++){
    const pid = activeLockPid();
    if(pid === process.ppid) return 'parent';
    if(pid) return false;
    // Verrou orphelin (processus disparu ou verrou trop ancien) : supprimé, puis création exclusive.
    // Renommage atomique avant suppression : ne peut pas effacer un verrou qu'un autre processus vient de prendre.
    const stale = LOCK + '.stale-' + process.pid;
    try {
      fs.renameSync(LOCK, stale);
      // Verrou actif pris entre-temps par un autre processus : remis en place.
      const stalePid = parseInt(fs.readFileSync(stale, 'utf8'), 10);
      if(stalePid > 0 && stalePid !== process.pid){ try { process.kill(stalePid, 0); fs.linkSync(stale, LOCK); } catch(e2){ if(e2.code === 'EPERM'){ try { fs.linkSync(stale, LOCK); } catch(e3){} } } }
      fs.rmSync(stale, { force: true });
    } catch(e){ if(e.code !== 'ENOENT') throw e; }
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
      return true;
    } catch(e){
      if(e.code !== 'EEXIST') throw e; // un autre processus l'a créé entre-temps : on réexamine une fois
    }
  }
  return false;
}

let lock = false;
try {
  lock = acquireLock();
  if(!lock){
    console.log('[build-search-index] construction déjà en cours dans un autre processus (verrou ' + LOCK + ') : rien à faire.');
  } else {
    // Chargés seulement ici : inutile de charger le moteur pour ressortir aussitôt.
    const searchIndex = require('../lib/search-index.js');
    const tripEngine = require('../lib/trip-engine.js');
    const t0 = Date.now();
    let lines = 0;
    const res = searchIndex.build(DATA_DIR, OUT_DIR, tripEngine.internals, function(){ lines++; });
    const mem = process.memoryUsage();
    console.log('[build-search-index] ' + res.places + ' lieux, ' + res.entries + ' entrées (' + lines + ' fichiers de pays) en '
      + Math.round((Date.now() - t0) / 1000) + ' s — mémoire (RSS) en fin de construction ' + Math.round(mem.rss / 1048576) + ' Mo.');
  }
} catch(err){
  console.error('[build-search-index] ÉCHEC : ' + err.message);
  console.error('[build-search-index] Le serveur utilisera la recherche en mémoire (disponible après chargement du moteur).');
  process.exitCode = 1;
} finally {
  // Retiré seulement s'il est toujours le nôtre.
  if(lock === true){
    try { if(fs.readFileSync(LOCK, 'utf8') === String(process.pid)) fs.unlinkSync(LOCK); } catch(e){ /* déjà retiré */ }
  }
}
