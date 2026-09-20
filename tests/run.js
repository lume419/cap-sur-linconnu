#!/usr/bin/env node
// Lanceur de la suite de tests (voir tests/README.md).
//   node tests/run.js                 suite standard (tout sauf les générateurs), tailles par défaut
//   node tests/run.js --quick         i18n + péages + invariants du moteur réduits (~1 min ; 56 s le 20/09/2026)
//   node tests/run.js --full          tout, tailles complètes, générateurs compris (TEST_FULL=1)
//   node tests/run.js toll server     seulement les fichiers dont le nom contient « toll » ou « server »
// Autres options transmises telles quelles à node --test (ex. --test-name-pattern="péage").
// Les fichiers sont exécutés l'un après l'autre (chaque processus charge le moteur : ~30 s, ~3 Go).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const quick = args.includes('--quick'), full = args.includes('--full');
const filters = args.filter(a => !a.startsWith('--'));
const passthrough = args.filter(a => a.startsWith('--') && a !== '--quick' && a !== '--full');

const ORDER = ['i18n', 'toll', 'engine-invariants', 'perf', 'server', 'generators'];
let files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js'))
  .sort((a, b) => (ORDER.indexOf(a.replace('.test.js', '')) + 1 || 99) - (ORDER.indexOf(b.replace('.test.js', '')) + 1 || 99));
if(quick) files = files.filter(f => /^(i18n|toll|engine-invariants)\./.test(f));
if(filters.length) files = files.filter(f => filters.some(x => f.includes(x)));
if(!files.length){ console.error('aucun fichier de test sélectionné'); process.exit(2); }

const env = Object.assign({}, process.env);
env.NODE_OPTIONS = ((env.NODE_OPTIONS || '') + ' --max-old-space-size=8192').trim();
if(full){ env.TEST_FULL = '1'; }
if(quick && !env.TEST_TRIPS) env.TEST_TRIPS = '100';

console.log('[tests] ' + files.join(', ') + (full ? ' (complet)' : quick ? ' (rapide)' : ''));
const t0 = Date.now();
const r = spawnSync(process.execPath, ['--max-old-space-size=8192', '--test', '--test-concurrency=1', '--test-reporter=spec', ...passthrough, ...files.map(f => path.join(__dirname, f))],
  { stdio: 'inherit', env, cwd: path.resolve(__dirname, '..') });
console.log('[tests] durée totale ' + Math.round((Date.now() - t0) / 1000) + ' s');
process.exit(r.status === null ? 1 : r.status);
