#!/usr/bin/env node
// Outil de COMPARAISON DE VERSIONS du moteur (13e audit du 19/09/2026, complété aux 14e et 15e audits du 19/09/2026) — voir
// tests/README.md, section « Comparer deux versions du moteur ».
//
//   npm run test:compare                      ancien = HEAD, nouveau = répertoire de travail
//   npm run test:compare -- 3d53524           ancien = 3d53524, nouveau = répertoire de travail
//   node tests/compare-engine.js 3d53524 a8aa4bc   deux versions commitées
//   node tests/compare-engine.js --clean      nettoyage du dossier temporaire seulement, puis sortie
// Options :
//   --fail-on-diff   code de sortie 1 si un tirage, un trajet direct, un plafond d'hébergement ou un temps de calcul a changé
//   --sequential     un moteur après l'autre (par défaut : en parallèle si la mémoire libre dépasse 20 Go)
//   --parallel       les deux moteurs en même temps
//   --all            résumé complet (pays et groupes sans changement compris)
//   --temps-reel     rejoue aussi les cas ciblés marqués « rt » avec l'horloge NORMALE (budget de 4 s comme en production) :
//                    résumé séparé, dépendant de la machine, hors de --fail-on-diff (14e audit)
//   --clean          nettoie le dossier temporaire (voir plus bas) et s'arrête. ATTENTION : seul, --clean NE supprime
//                    PAS une extraction utilisée depuis moins de COMPARE_GARDER_JOURS jours (celle du dernier lancement
//                    reste donc) ; il supprime les extractions plus anciennes, les dossiers run-*/ de plus d'un jour et les
//                    rapports au-delà des COMPARE_GARDER_RAPPORTS plus récents.
//   --clean --force  supprime en plus TOUTES les extractions et tous les dossiers run-*/, quel que soit leur âge (ne pas
//                    le lancer pendant une autre comparaison) ; les rapports restent élagués comme avec --clean (15e audit)
//   --aide, --help   affiche cette aide
// Variables : COMPARE_TIRAGES (nombre de tirages, 380 par défaut, cas ciblés compris — 15e audit : 360 → 380 pour garder
// 132 tirages ordinaires malgré les 20 cas ciblés ajoutés), COMPARE_GARDER_JOURS (7 : âge maximal d'une extraction
// inutilisée), COMPARE_GARDER_RAPPORTS (10 : nombre de rapports gardés, le nouveau compris).
// Contre-épreuve (15e audit du 19/09/2026) : chaque « hors de portée, X km » (ancien et nouveau moteur) est rejoué à
// minDistanceKm = X ; une contre-épreuve échouée du NOUVEAU moteur compte dans --fail-on-diff (voir tests/helpers/compare.js).
// Horodatage des rapports : heure LOCALE (15e audit : c'était l'heure UTC, sans le dire), fuseau indiqué dans le rapport.
//
// Principe : l'ANCIEN moteur est extrait de git (git show, jamais de checkout : le répertoire de travail n'est pas touché)
// dans os.tmpdir()/cap-sur-linconnu-compare/<commit>/ : lib/, public/js/trip-data.js et data/*.json toujours (petits,
// chargés par le moteur relativement à son propre dossier) ; les gros fichiers de données (public/data/communes*.txt,
// featured.txt, data/charging-stations.txt) seulement s'ils diffèrent du répertoire de travail (git diff), sinon ceux du
// dépôt sont relus tels quels. Chaque moteur tourne dans son propre processus (~3 à 5 Go chacun) qui écrit ses résultats
// en JSON ; la comparaison vient ensuite. Rapport texte sur la sortie standard, rapport texte + JSON détaillé dans
// os.tmpdir()/cap-sur-linconnu-compare/. Code de sortie 0 : c'est un outil de revue, pas un test bloquant.
//
// Nettoyage (14e audit : 107 Mo + 54 Mo d'extractions et les rapports s'accumulaient sans fin) : à chaque lancement, et
// seul avec --clean, sont supprimés les extractions <commit>/ inutilisées depuis plus de COMPARE_GARDER_JOURS jours (date
// du fichier .dernier-usage, mise à jour à chaque usage ; jamais une extraction utilisée depuis moins d'une heure, qui peut
// servir à un autre lancement en cours), les dossiers de travail run-*/ de plus d'un jour (lancement interrompu) et les
// rapports au-delà des COMPARE_GARDER_RAPPORTS plus récents (15e audit : élagués APRÈS l'écriture du nouveau rapport). La
// taille du dossier est affichée avant et après.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const C = require('./helpers/compare.js');

const REPO = path.resolve(__dirname, '..');
const BASE = path.join(os.tmpdir(), 'cap-sur-linconnu-compare');
const USAGE_MARK = '.dernier-usage';

// ------------------------------------------------------------------------------------------------ mode travailleur
if(process.argv[2] === '--worker'){
  const job = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const log = s => process.stderr.write('[' + job.label + '] ' + s + '\n');
  C.runWorker(job, log).then(out => {
    fs.writeFileSync(job.out, JSON.stringify(out));
    process.exit(0);
  }, e => { log('ÉCHEC ' + (e && e.stack || e)); process.exit(3); });
  return;
}

// ------------------------------------------------------------------------------------------------ préparation
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const refs = args.filter(a => !a.startsWith('--'));
const N = Math.max(1, parseInt(process.env.COMPARE_TIRAGES || '380', 10) || 380);
const intEnv = (name, def) => { const v = parseInt(process.env[name], 10); return isFinite(v) && v >= 0 ? v : def; };
const KEEP_DAYS = intEnv('COMPARE_GARDER_JOURS', 7), KEEP_REPORTS = intEnv('COMPARE_GARDER_RAPPORTS', 10);

function git(argv, opts){ return execFileSync('git', argv, Object.assign({ cwd: REPO, maxBuffer: 1 << 30 }, opts || {})); }
function resolveRef(ref){
  const sha = git(['rev-parse', '--verify', ref + '^{commit}']).toString().trim();
  const subject = git(['log', '-1', '--format=%s', sha]).toString().trim();
  return { sha, short: sha.slice(0, 7), label: sha.slice(0, 7) + ' (' + subject.slice(0, 60) + ')' };
}
function lsTree(sha, p){ return git(['ls-tree', '-r', '--name-only', sha, '--', p]).toString().split('\n').filter(Boolean); }
function extract(sha, rel, dest){
  if(fs.existsSync(dest)) return; // contenu d'un commit : immuable, la copie d'un lancement précédent reste valable
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest + '.tmp', git(['show', sha + ':' + rel]));
  fs.renameSync(dest + '.tmp', dest);
}
const COMMUNE_RE = /^public\/data\/communes(?:-([a-z]{2}))?\.txt$/;
const ccOf = rel => { const m = rel.match(COMMUNE_RE); return m[1] ? m[1].toUpperCase() : 'FR'; };

// ------------------------------------------------------------------------------------------------ nettoyage (14e audit)
function sizeOf(p){
  let st;
  try { st = fs.lstatSync(p); } catch(e){ return 0; }
  if(!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((s, f) => s + sizeOf(path.join(p, f)), 0);
}
const mo = b => (b / 1048576).toFixed(1) + ' Mo';
function lastUse(dir){
  try { return fs.statSync(path.join(dir, USAGE_MARK)).mtimeMs; } catch(e){ /* extraction antérieure au 14e audit */ }
  try { return fs.statSync(dir).mtimeMs; } catch(e){ return 0; }
}
function markUsed(dir){ fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, USAGE_MARK), new Date().toISOString()); }
// opts.reports : élaguer aussi les rapports (15e audit du 19/09/2026 : fait APRÈS l'écriture du nouveau rapport, sinon il
// en restait COMPARE_GARDER_RAPPORTS + 1) ; opts.force (--clean --force) : toutes les extractions et dossiers run-*/.
function cleanBase(protect, opts){
  opts = opts || {};
  if(!fs.existsSync(BASE)) return { before: 0, after: 0, removed: [] };
  const before = sizeOf(BASE), now = Date.now(), removed = [];
  const rm = (name, why) => { const p = path.join(BASE, name), s = sizeOf(p); fs.rmSync(p, { recursive: true, force: true }); removed.push(name + ' (' + mo(s) + ', ' + why + ')'); };
  const entries = fs.readdirSync(BASE, { withFileTypes: true });
  entries.forEach(e => {
    const p = path.join(BASE, e.name);
    if(e.isDirectory() && /^[0-9a-f]{12}$/.test(e.name)){
      if(protect.has(e.name)) return;
      const age = now - lastUse(p);
      if(opts.force) rm(e.name, 'forcé, utilisée il y a ' + (age / 86400e3).toFixed(1) + ' j');
      else if(age > Math.max(KEEP_DAYS * 86400e3, 3600e3)) rm(e.name, 'inutilisée depuis ' + (age / 86400e3).toFixed(1) + ' j');
    } else if(e.isDirectory() && /^run-/.test(e.name)){
      if(opts.force) rm(e.name, 'forcé');
      else if(now - fs.statSync(p).mtimeMs > 86400e3) rm(e.name, 'lancement interrompu');
    }
  });
  if(opts.reports) pruneReports(entries, rm);
  return { before, after: sizeOf(BASE), removed };
}
function pruneReports(entries, rm){
  // Rapports : paires .txt/.json d'un même nom, les plus récents d'abord (horodatage dans le nom et date du fichier).
  const reports = new Map();
  entries.filter(e => e.isFile() && /^rapport-.*\.(txt|json)$/.test(e.name)).forEach(e => {
    const stem = e.name.replace(/\.(txt|json)$/, ''), t = fs.statSync(path.join(BASE, e.name)).mtimeMs;
    const r = reports.get(stem) || { files: [], t: 0 };
    r.files.push(e.name); r.t = Math.max(r.t, t); reports.set(stem, r);
  });
  [...reports.entries()].sort((a, b) => b[1].t - a[1].t).slice(KEEP_REPORTS).forEach(([, r]) => r.files.forEach(f => rm(f, 'ancien rapport')));
}
// Élagage des rapports seul, après l'écriture du nouveau (15e audit).
function cleanReports(){
  if(!fs.existsSync(BASE)) return { before: 0, after: 0, removed: [] };
  const before = sizeOf(BASE), removed = [];
  const rm = (name, why) => { const p = path.join(BASE, name), s = sizeOf(p); fs.rmSync(p, { force: true }); removed.push(name + ' (' + mo(s) + ', ' + why + ')'); };
  pruneReports(fs.readdirSync(BASE, { withFileTypes: true }), rm);
  return { before, after: sizeOf(BASE), removed };
}
// Horodatage LOCAL (15e audit du 19/09/2026 : toISOString donnait l'heure UTC sans le dire) : « 20260919-143512 » et
// fuseau « UTC+02:00 ».
function localStamp(d){
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function tzLabel(d){
  const off = -d.getTimezoneOffset(), a = Math.abs(off);
  return 'UTC' + (off >= 0 ? '+' : '−') + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
}
function logClean(c){
  process.stderr.write('[compare] dossier temporaire ' + BASE + ' : ' + mo(c.before) + (c.removed.length ? ' → ' + mo(c.after) + ' après nettoyage (' + c.removed.length +
    ' élément(s) supprimé(s) : ' + c.removed.join(', ') + ')' : ', rien à nettoyer') + ' — extractions gardées ' + KEEP_DAYS + ' j, ' + KEEP_REPORTS + ' rapports gardés\n');
}

// ------------------------------------------------------------------------------------------------ fichiers différents (14e audit)
// Fichiers lus par le moteur (ou par l'outil pour construire le bundle) qui diffèrent entre les deux versions : distingue un
// changement de CODE d'un changement de DONNÉES (Bamako hybride 14 jours changé par une ligne retirée de communes-ci.txt).
const WATCH = ['lib', 'data', 'public/js/trip-data.js', 'public/data'];
function classify(p){
  if(/^lib\//.test(p) || p === 'public/js/trip-data.js') return 'code';
  if(COMMUNE_RE.test(p) || p === 'public/data/featured.txt' || p === 'data/charging-stations.txt' || /^data\/[^/]+\.json$/.test(p)) return 'data';
  return 'other'; // aliases-*.txt (recherche, non chargés par l'outil), communes-bundle.txt (reconstruit), etc.
}
function changedFiles(oldSha, newSha){
  const range = newSha ? [oldSha, newSha] : [oldSha];
  const status = new Map(), stat = new Map();
  git(['diff', '--name-status', '--no-renames'].concat(range, ['--'], WATCH)).toString().split('\n').filter(Boolean).forEach(l => { const [s, p] = l.split('\t'); status.set(p, s); });
  git(['diff', '--numstat', '--no-renames'].concat(range, ['--'], WATCH)).toString().split('\n').filter(Boolean).forEach(l => { const [a, d, p] = l.split('\t'); stat.set(p, [a, d]); });
  if(!newSha){
    try { git(['ls-files', '--others', '--exclude-standard', '--'].concat(WATCH)).toString().split('\n').filter(Boolean).forEach(p => status.set(p, '??')); } catch(e){ /* hors dépôt */ }
  }
  const out = { code: [], data: [], other: [] };
  [...status.keys()].sort().forEach(p => {
    const s = stat.get(p);
    out[classify(p)].push({ path: p, status: status.get(p), add: s && s[0] !== '-' ? +s[0] : null, del: s && s[1] !== '-' ? +s[1] : null });
  });
  return out;
}

// Moteur d'un commit : racine temporaire + sources de données (réutilisées si identiques au répertoire de travail).
function prepareRef(r){
  const root = path.join(BASE, r.sha.slice(0, 12));
  markUsed(root);
  const code = lsTree(r.sha, 'lib').concat(lsTree(r.sha, 'data').filter(f => /\.json$/.test(f)), ['public/js/trip-data.js']);
  code.forEach(rel => extract(r.sha, rel, path.join(root, rel)));
  const dataFiles = lsTree(r.sha, 'public/data').filter(f => COMMUNE_RE.test(f)).concat(['public/data/featured.txt', 'data/charging-stations.txt']);
  const changed = new Set(git(['diff', '--name-only', r.sha, '--', 'public/data', 'data/charging-stations.txt']).toString().split('\n').filter(Boolean));
  let copied = 0;
  const src = rel => {
    const here = path.join(REPO, rel);
    if(!changed.has(rel) && fs.existsSync(here)) return here;
    copied++;
    const dest = path.join(root, rel);
    extract(r.sha, rel, dest);
    return dest;
  };
  const sources = {
    communes: dataFiles.filter(f => COMMUNE_RE.test(f)).map(rel => ({ name: path.basename(rel), cc: ccOf(rel), file: src(rel) })),
    featured: src('public/data/featured.txt'),
    chargers: lsTree(r.sha, 'data/charging-stations.txt').length ? src('data/charging-stations.txt') : null,
  };
  process.stderr.write('[compare] ' + r.label + ' : moteur extrait dans ' + root + ' (' + mo(sizeOf(root)) + '), ' + copied + ' fichier(s) de données différent(s) du répertoire de travail extrait(s)\n');
  return { root, sources, label: r.label };
}
function prepareWorktree(){
  const dir = path.join(REPO, 'public', 'data');
  const communes = fs.readdirSync(dir).filter(f => /^communes(?:-([a-z]{2}))?\.txt$/.test(f))
    .map(f => ({ name: f, cc: ccOf('public/data/' + f), file: path.join(dir, f) }));
  const chargers = path.join(REPO, 'data', 'charging-stations.txt');
  let dirty = '';
  try { dirty = git(['status', '--porcelain', '--', 'lib', 'data', 'public/js/trip-data.js', 'public/data']).toString().trim(); } catch(e){ /* hors dépôt git */ }
  const label = 'répertoire de travail' + (dirty ? ' (' + dirty.split('\n').length + ' fichier(s) modifié(s))' : '');
  return { root: REPO, sources: { communes, featured: path.join(dir, 'featured.txt'), chargers: fs.existsSync(chargers) ? chargers : null }, label };
}

function runJob(side, tag, runDir){
  const job = { root: side.root, sources: side.sources, label: tag, n: N, realtime: flags.has('--temps-reel'), out: path.join(runDir, tag + '.json') };
  const jobFile = path.join(runDir, tag + '-job.json');
  fs.writeFileSync(jobFile, JSON.stringify(job));
  return new Promise((resolve, reject) => {
    // Sortie standard du travailleur (journal du moteur) renvoyée sur l'erreur standard : seul le rapport va sur stdout.
    const child = spawn(process.execPath, ['--max-old-space-size=8192', __filename, '--worker', jobFile], { stdio: ['ignore', 2, 2], cwd: REPO });
    const stop = () => { try { child.kill(); } catch(e){ /* déjà arrêté */ } };
    process.once('SIGINT', stop);
    child.on('exit', code => {
      process.removeListener('SIGINT', stop);
      if(code !== 0) return reject(new Error('processus ' + tag + ' terminé avec le code ' + code));
      const out = JSON.parse(fs.readFileSync(job.out, 'utf8'));
      out.label = side.label;
      resolve(out);
    });
  });
}

async function main(){
  const t0 = Date.now();
  if(flags.has('--aide') || flags.has('--help')){
    // Aide : l'en-tête de ce fichier (15e audit du 19/09/2026).
    const head = fs.readFileSync(__filename, 'utf8').split('\n').slice(1);
    console.log(head.slice(0, head.findIndex(l => !l.startsWith('//'))).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
    return;
  }
  if(flags.has('--clean')){
    const force = flags.has('--force');
    logClean(cleanBase(new Set(), { reports: true, force }));
    if(!force) process.stderr.write('[compare] --clean seul garde les extractions utilisées depuis moins de ' + KEEP_DAYS + ' j (et toujours depuis moins d\'une heure) ; --clean --force pour tout supprimer\n');
    return;
  }
  const oldRef = resolveRef(refs[0] || 'HEAD');
  const newRef = refs[1] ? resolveRef(refs[1]) : null;
  fs.mkdirSync(BASE, { recursive: true });
  const clean = cleanBase(new Set([oldRef.sha.slice(0, 12)].concat(newRef ? [newRef.sha.slice(0, 12)] : [])));
  logClean(clean);
  const A = prepareRef(oldRef);
  const B = newRef ? prepareRef(newRef) : prepareWorktree();
  const files = changedFiles(oldRef.sha, newRef && newRef.sha);
  const startDate = new Date(t0), stamp = localStamp(startDate);
  const runDir = path.join(BASE, 'run-' + stamp);
  fs.mkdirSync(runDir, { recursive: true });
  const parallel = flags.has('--parallel') || (!flags.has('--sequential') && os.freemem() > 20 * 1024 ** 3);
  process.stderr.write('[compare] ' + N + ' tirages demandés' + (flags.has('--temps-reel') ? ' (+ temps réel)' : '') + ', moteurs ' + (parallel ? 'en parallèle' : 'l\'un après l\'autre') + '\n');
  let ra, rb;
  try {
    if(parallel) [ra, rb] = await Promise.all([runJob(A, 'ancien', runDir), runJob(B, 'nouveau', runDir)]);
    else { ra = await runJob(A, 'ancien', runDir); rb = await runJob(B, 'nouveau', runDir); }
  } finally { fs.rmSync(runDir, { recursive: true, force: true }); }
  const R = C.compareRuns(ra, rb);
  R.files = files;
  R.parallel = parallel;
  R.durationMs = Date.now() - t0;
  R.startedAt = stamp + ' ' + tzLabel(startDate);
  const text = C.formatReport(R, { all: flags.has('--all') }) + '\nLancé le ' + startDate.toLocaleString('fr-FR') + ' (heure locale, ' + tzLabel(startDate) + ')' +
    '\nDurée totale : ' + Math.round(R.durationMs / 1000) + ' s' + (parallel ? ' (moteurs en parallèle)' : '') +
    '\nDossier temporaire : ' + mo(sizeOf(BASE)) + ' (' + BASE + ' ; node tests/compare-engine.js --clean pour nettoyer, --clean --force pour tout supprimer)';
  const name = 'rapport-' + oldRef.short + '-vs-' + (newRef ? newRef.short : 'travail') + '-' + stamp;
  const jsonFile = path.join(BASE, name + '.json'), txtFile = path.join(BASE, name + '.txt');
  fs.writeFileSync(jsonFile, JSON.stringify(R, null, 1));
  fs.writeFileSync(txtFile, text);
  // Élagage des rapports APRÈS l'écriture du nouveau (15e audit : il en restait COMPARE_GARDER_RAPPORTS + 1).
  const pr = cleanReports();
  if(pr.removed.length) logClean(pr);
  console.log(text);
  console.log('Rapport : ' + txtFile + '\nJSON détaillé : ' + jsonFile);
  if(flags.has('--fail-on-diff') && C.diffCount(R)) process.exitCode = 1;
}

main().catch(e => { console.error('[compare] ÉCHEC : ' + (e && e.stack || e)); process.exitCode = 2; });
