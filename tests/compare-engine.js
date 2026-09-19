#!/usr/bin/env node
// Outil de COMPARAISON DE VERSIONS du moteur (13e audit du 19/09/2026) — voir tests/README.md, section « Comparer deux
// versions du moteur ».
//
//   npm run test:compare                      ancien = HEAD, nouveau = répertoire de travail
//   npm run test:compare -- 3d53524           ancien = 3d53524, nouveau = répertoire de travail
//   node tests/compare-engine.js 3d53524 a8aa4bc   deux versions commitées
// Options :
//   --fail-on-diff   code de sortie 1 si un tirage, un trajet direct ou un temps de calcul a changé (usage automatique)
//   --sequential     un moteur après l'autre (par défaut : en parallèle si la mémoire libre dépasse 20 Go)
//   --parallel       les deux moteurs en même temps
//   --all            résumé complet (pays et groupes sans changement compris)
// Variables : COMPARE_TIRAGES (nombre de tirages, 300 par défaut, cas ciblés compris).
//
// Principe : l'ANCIEN moteur est extrait de git (git show, jamais de checkout : le répertoire de travail n'est pas touché)
// dans os.tmpdir()/cap-sur-linconnu-compare/<commit>/ : lib/, public/js/trip-data.js et data/*.json toujours (petits,
// chargés par le moteur relativement à son propre dossier) ; les gros fichiers de données (public/data/communes*.txt,
// featured.txt, data/charging-stations.txt) seulement s'ils diffèrent du répertoire de travail (git diff), sinon ceux du
// dépôt sont relus tels quels. Chaque moteur tourne dans son propre processus (~3 à 5 Go chacun) qui écrit ses résultats
// en JSON ; la comparaison vient ensuite. Rapport texte sur la sortie standard, rapport texte + JSON détaillé dans
// os.tmpdir()/cap-sur-linconnu-compare/. Code de sortie 0 : c'est un outil de revue, pas un test bloquant.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const C = require('./helpers/compare.js');

const REPO = path.resolve(__dirname, '..');
const BASE = path.join(os.tmpdir(), 'cap-sur-linconnu-compare');

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
const N = Math.max(1, parseInt(process.env.COMPARE_TIRAGES || '300', 10) || 300);

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

// Moteur d'un commit : racine temporaire + sources de données (réutilisées si identiques au répertoire de travail).
function prepareRef(r){
  const root = path.join(BASE, r.sha.slice(0, 12));
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
  process.stderr.write('[compare] ' + r.label + ' : moteur extrait dans ' + root + ', ' + copied + ' fichier(s) de données différent(s) du répertoire de travail extrait(s)\n');
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
  const job = { root: side.root, sources: side.sources, label: tag, n: N, out: path.join(runDir, tag + '.json') };
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
  const oldRef = resolveRef(refs[0] || 'HEAD');
  const newRef = refs[1] ? resolveRef(refs[1]) : null;
  fs.mkdirSync(BASE, { recursive: true });
  const A = prepareRef(oldRef);
  const B = newRef ? prepareRef(newRef) : prepareWorktree();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
  const runDir = path.join(BASE, 'run-' + stamp);
  fs.mkdirSync(runDir, { recursive: true });
  const parallel = flags.has('--parallel') || (!flags.has('--sequential') && os.freemem() > 20 * 1024 ** 3);
  process.stderr.write('[compare] ' + N + ' tirages demandés, moteurs ' + (parallel ? 'en parallèle' : 'l\'un après l\'autre') + '\n');
  let ra, rb;
  if(parallel) [ra, rb] = await Promise.all([runJob(A, 'ancien', runDir), runJob(B, 'nouveau', runDir)]);
  else { ra = await runJob(A, 'ancien', runDir); rb = await runJob(B, 'nouveau', runDir); }
  const R = C.compareRuns(ra, rb);
  R.parallel = parallel;
  R.durationMs = Date.now() - t0;
  const text = C.formatReport(R, { all: flags.has('--all') }) + '\nDurée totale : ' + Math.round(R.durationMs / 1000) + ' s' + (parallel ? ' (moteurs en parallèle)' : '');
  const name = 'rapport-' + oldRef.short + '-vs-' + (newRef ? newRef.short : 'travail') + '-' + stamp;
  const jsonFile = path.join(BASE, name + '.json'), txtFile = path.join(BASE, name + '.txt');
  fs.writeFileSync(jsonFile, JSON.stringify(R, null, 1));
  fs.writeFileSync(txtFile, text);
  fs.rmSync(runDir, { recursive: true, force: true });
  console.log(text);
  console.log('Rapport : ' + txtFile + '\nJSON détaillé : ' + jsonFile);
  const changed = R.tirages.changed + R.legs.changed + R.timing.slow.length + R.tirages.onlyA.length + R.tirages.onlyB.length;
  if(flags.has('--fail-on-diff') && changed) process.exitCode = 1;
}

main().catch(e => { console.error('[compare] ÉCHEC : ' + (e && e.stack || e)); process.exitCode = 2; });
