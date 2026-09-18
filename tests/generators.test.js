// Générateurs hors ligne (désactivé par défaut, ~35 s : TEST_GENERATORS=1 ou npm run test:full) : chaque générateur
// qui réécrit une section de public/js/trip-data.js doit reproduire le fichier du dépôt À L'OCTET PRÈS (sinon la
// section a été modifiée à la main, ou ses sources dans scripts/ ne correspondent plus au fichier livré).
// Les générateurs écrivent en dur dans ../public/js/trip-data.js : ils sont exécutés dans une COPIE temporaire
// (scripts, lib et trip-data.js copiés ; public/data et node_modules en jonction, en lecture seule) — le dépôt
// n'est jamais modifié.
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENABLED = process.env.TEST_GENERATORS === '1' || process.env.TEST_FULL === '1';
const SKIP = ENABLED ? false : 'désactivé par défaut : TEST_GENERATORS=1 ou npm run test:full';
const GENERATORS = ['build-tension-zones.js', 'build-transport-rules.js', 'build-lodging-rules.js', 'build-island-rules.js'];
const SUPPORT_SCRIPTS = ['build-ferry-ports.js'];
const SOURCE_DIRS = ['tension-zones', 'transport', 'lodging', 'iles', 'ferry-ports'];

let TMP = null;
const REF = path.join(ROOT, 'public', 'js', 'trip-data.js');
let refBytes = null;

before(() => {
  if(!ENABLED) return;
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-generateurs-'));
  fs.mkdirSync(path.join(TMP, 'scripts'));
  fs.mkdirSync(path.join(TMP, 'public', 'js'), { recursive: true });
  for(const f of GENERATORS.concat(SUPPORT_SCRIPTS)) fs.copyFileSync(path.join(ROOT, 'scripts', f), path.join(TMP, 'scripts', f));
  for(const d of SOURCE_DIRS) if(fs.existsSync(path.join(ROOT, 'scripts', d))) fs.cpSync(path.join(ROOT, 'scripts', d), path.join(TMP, 'scripts', d), { recursive: true });
  fs.cpSync(path.join(ROOT, 'lib'), path.join(TMP, 'lib'), { recursive: true });
  fs.symlinkSync(path.join(ROOT, 'public', 'data'), path.join(TMP, 'public', 'data'), 'junction');
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(TMP, 'node_modules'), 'junction');
  refBytes = fs.readFileSync(REF);
});

after(() => {
  if(!TMP) return;
  // Jonctions retirées AVANT la suppression récursive (sinon rmSync pourrait descendre dans les dossiers réels).
  for(const j of [path.join(TMP, 'public', 'data'), path.join(TMP, 'node_modules')]) try { fs.unlinkSync(j); } catch(e){ try { fs.rmdirSync(j); } catch(e2){} }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch(e){}
});

// Premier octet différent et contexte, pour un message lisible.
function firstDiff(a, b){
  const n = Math.min(a.length, b.length);
  let i = 0; while(i < n && a[i] === b[i]) i++;
  if(i === n && a.length === b.length) return null;
  const line = a.slice(0, i).toString('utf8').split('\n').length;
  return 'premier écart à l\'octet ' + i + ' (ligne ' + line + ') : dépôt « ' + a.slice(Math.max(0, i - 40), i + 60).toString('utf8').replace(/\n/g, '⏎') +
    ' » / régénéré « ' + b.slice(Math.max(0, i - 40), i + 60).toString('utf8').replace(/\n/g, '⏎') + ' » (tailles ' + a.length + ' / ' + b.length + ')';
}

for(const gen of GENERATORS){
  test('générateur ' + gen + ' : trip-data.js reproduit à l\'octet près', { skip: SKIP, timeout: 30 * 60000 }, t => {
    const copy = path.join(TMP, 'public', 'js', 'trip-data.js');
    fs.writeFileSync(copy, refBytes); // copie fraîche : chaque générateur est jugé seul
    const t0 = Date.now();
    const r = spawnSync(process.execPath, ['--max-old-space-size=8192', path.join(TMP, 'scripts', gen)], { cwd: TMP, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    t.diagnostic(gen + ' : ' + Math.round((Date.now() - t0) / 1000) + ' s, code ' + r.status);
    assert.equal(r.status, 0, gen + ' a échoué :\n' + String(r.stderr || '').slice(-2000) + String(r.stdout || '').slice(-1000));
    assert.equal(Buffer.compare(fs.readFileSync(REF), refBytes), 0, 'public/js/trip-data.js du dépôt modifié pendant le test (autre travail en cours ?)');
    const diff = firstDiff(refBytes, fs.readFileSync(copy));
    assert.equal(diff, null, diff);
  });
}
