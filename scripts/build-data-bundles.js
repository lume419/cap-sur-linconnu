// Précompile les bundles /data/communes-bundle.txt et /data/aliases-bundle.txt — texte brut +
// versions gzip et brotli déjà compressées — pour que server.js n'ait plus JAMAIS à compresser
// quoi que ce soit au moment de répondre à une requête (voir server.js, section "Bundles /data/"
// pour le contexte complet). Deux enseignements coup sur coup ont mené ici :
// 1. L'hébergement mutualisé (o2switch) compresse en temps réel nettement moins bien qu'en local
//    (mesuré : -49,5 % sur testroad.lume419.fr contre -66,7 % en local, même donnée) — sans doute
//    pour préserver son CPU partagé.
// 2. Compresser CE MÊME contenu en tâche de fond côté serveur (gzip + brotli, en asynchrone pour
//    ne bloquer aucune requête — tentative précédente) s'est quand même révélé plus LENT en
//    conditions réelles qu'avant (~8 s à froid contre ~4-5 s) : sur un CPU partagé et déjà limité,
//    quatre compressions simultanées (gzip+brotli × 2 bundles, exactement la taille du threadpool
//    libuv par défaut) se sont mises à se concurrencer pour le même CPU, ralentissant même le gzip
//    dont dépendait la réponse — l'asynchrone évite de BLOQUER le process, mais ne fait rien contre
//    la contention CPU réelle sur un hébergement déjà limité.
// Conclusion : ne plus JAMAIS compresser au moment de répondre à une requête, seulement au moment
// du déploiement — ce script tourne sur la machine de déploiement (ou dans "Run NPM Install" côté
// cPanel, voir "postinstall" dans package.json), jamais dans le process qui sert les visiteurs. Il
// peut donc se permettre de prendre son temps : brotli à qualité MAXIMALE (~67 s mesurés sur le
// bundle communes, ~26 Mo) plutôt que la qualité 9 retenue précédemment par contrainte de temps —
// puisque ce temps n'est plus jamais sur le chemin critique d'une requête, autant obtenir le
// meilleur taux de compression possible.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

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
  var br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY } });
  fs.writeFileSync(path.join(DATA_DIR, name + '.txt.br'), br);
  var ms = Date.now() - t0;
  console.log(buf.length + ' -> gzip ' + gz.length + ' (' + Math.round(100 - 100 * gz.length / buf.length) + '%), '
    + 'brotli ' + br.length + ' (' + Math.round(100 - 100 * br.length / buf.length) + '%) — ' + ms + ' ms');
}

buildOne('communes-bundle', /^communes(?:-([a-z]{2}))?\.txt$/, 'FR');
buildOne('aliases-bundle', /^aliases-([a-z]{2})\.txt$/, '');
console.log('[build-data-bundles] terminé — relancer ce script après tout ajout/modification de pays.');
