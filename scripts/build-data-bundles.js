// Précompile les bundles /data/communes-bundle.txt et /data/aliases-bundle.txt — texte brut +
// versions gzip et brotli déjà compressées — pour que server.js n'ait plus JAMAIS à compresser
// quoi que ce soit au moment de répondre à une requête (voir server.js, section "Bundles /data/"
// pour le contexte complet). Trois enseignements coup sur coup ont mené ici, chacun mesuré en
// conditions réelles sur testroad.lume419.fr (hébergement mutualisé o2switch) :
// 1. L'hébergement compresse en temps réel nettement moins bien qu'en local (mesuré : -49,5 % sur
//    testroad contre -66,7 % en local, même donnée) — sans doute pour préserver son CPU partagé.
// 2. Compresser CE MÊME contenu en tâche de fond côté serveur (gzip + brotli, en asynchrone pour
//    ne bloquer aucune requête — première tentative) s'est quand même révélé plus LENT en
//    conditions réelles (~8 s à froid contre ~4-5 s) : sur un CPU partagé et déjà limité, quatre
//    compressions simultanées (gzip+brotli × 2 bundles, exactement la taille du threadpool libuv
//    par défaut) se sont mises à se concurrencer pour le même CPU, ralentissant même le gzip dont
//    dépendait la réponse — l'asynchrone évite de BLOQUER le process, mais ne fait rien contre la
//    contention CPU réelle.
// 3. Précompiler au déploiement (ce script) plutôt qu'au runtime a réglé les deux points
//    précédents — mais une première version de CE script, en brotli qualité MAXIMALE (11), a fait
//    échouer "Run NPM Install" côté cPanel (npm error code 1, aucun détail applicatif dans le
//    journal npm — cohérent avec un plafond mémoire/temps d'exécution imposé par l'hébergeur sur
//    cette action précise, plutôt qu'une erreur JS classique). La qualité 9 (retenue ci-dessous),
//    elle, avait déjà tourné avec succès sur ce même hébergement lors de la tentative précédente
//    (point 2 ci-dessus, où elle échouait seulement à cause de la CONCURRENCE avec le gzip — pas à
//    cause d'un manque de ressources en tant que telle) : nettement plus sûre ici que la qualité
//    11, pour une perte de compression modeste (mesuré en local : 6,80 Mo à qualité 11 contre
//    8,07 Mo à qualité 9 sur le bundle communes — la qualité 9 reste très nettement meilleure que
//    le gzip seul, 8,87 Mo).
// Conclusion : ne plus JAMAIS compresser au moment de répondre à une requête, seulement au moment
// du déploiement — ce script tourne sur la machine de déploiement (ou dans "Run NPM Install" côté
// cPanel, voir "postinstall" dans package.json), jamais dans le process qui sert les visiteurs.
//
// Échec NON BLOQUANT pour npm install : voir "postinstall" dans package.json (`|| true` après cet
// appel) — un échec ici (mémoire, timeout, ou tout autre imprévu propre à l'environnement de
// déploiement) ne doit jamais empêcher l'installation des VRAIES dépendances (express, compression,
// pdfkit...) de se terminer correctement. Si les bundles précompilés restent absents malgré tout,
// server.js sait s'en passer (repli à la volée, voir son commentaire "Bundles /data/") — plus
// lent, mais jamais cassé.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const BROTLI_QUALITY = 9; // voir point 3 ci-dessus — jamais BROTLI_MAX_QUALITY (11) ici

// Même format de regroupement que server.js (un marqueur ###XX### par fichier d'origine, code
// pays en majuscules, France identifiée par 'FR' faute de suffixe dans son nom de fichier) — les
// deux doivent rester synchronisés si ce format change un jour, aucun des deux n'est la référence
// de l'autre.
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
  var raw = buildBundleText(re, franceCode);
  var buf = Buffer.from(raw, 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, name + '.txt'), raw, 'utf8');
  var gz = zlib.gzipSync(buf, { level: zlib.constants.Z_BEST_COMPRESSION });
  fs.writeFileSync(path.join(DATA_DIR, name + '.txt.gz'), gz);
  var br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } });
  fs.writeFileSync(path.join(DATA_DIR, name + '.txt.br'), br);
  var ms = Date.now() - t0;
  console.log(buf.length + ' -> gzip ' + gz.length + ' (' + Math.round(100 - 100 * gz.length / buf.length) + '%), '
    + 'brotli ' + br.length + ' (' + Math.round(100 - 100 * br.length / buf.length) + '%) — ' + ms + ' ms');
}

try {
  buildOne('communes-bundle', /^communes(?:-([a-z]{2}))?\.txt$/, 'FR');
  buildOne('aliases-bundle', /^aliases-([a-z]{2})\.txt$/, '');
  var mem = process.memoryUsage();
  console.log('[build-data-bundles] terminé — relancer ce script après tout ajout/modification de pays. '
    + 'Mémoire max utilisée : ' + Math.round(mem.rss / 1024 / 1024) + ' Mo (utile pour diagnostiquer un futur échec lié à un plafond mémoire de l\'hébergeur).');
} catch(err){
  // Ne JAMAIS laisser cette erreur remonter telle quelle sans contexte : voir "postinstall" dans
  // package.json, qui rend cet échec non bloquant pour npm install — mais un message clair ici
  // aide à diagnostiquer la prochaine fois (mémoire épuisée, disque plein, permissions...) sans
  // devoir recroiser un journal npm générique comme celui qui a mené à ce commentaire.
  console.error('[build-data-bundles] ÉCHEC : ' + err.message);
  console.error('[build-data-bundles] Les bundles précompilés restent absents ou partiels — '
    + 'server.js reconstruira à la volée (plus lent mais fonctionnel, voir son repli).');
  process.exitCode = 1;
}
