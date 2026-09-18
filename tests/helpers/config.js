// Réglages communs des tests (variables d'environnement, voir tests/README.md).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const FULL = process.env.TEST_FULL === '1';
const num = (name, def) => { const v = Number(process.env[name]); return isFinite(v) && v > 0 ? v : def; };

// Dossier des traces détaillées d'échec (hors dépôt).
const OUT_DIR = path.join(os.tmpdir(), 'cap-sur-linconnu-tests');
function outFile(name){
  try { fs.mkdirSync(OUT_DIR, { recursive: true }); } catch(e){}
  return path.join(OUT_DIR, name);
}

// Résumé lisible d'une liste de violations : nombre par message (chiffres masqués) et premiers exemples rejouables.
function summarize(list, max){
  max = max || 6;
  const byMsg = new Map();
  for(const x of list){ const k = x.inv + ' | ' + String(x.msg).replace(/-?\d+(\.\d+)?/g, '#'); byMsg.set(k, (byMsg.get(k) || 0) + 1); }
  const lines = [...byMsg.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => '  ' + n + ' × ' + k);
  const ex = list.slice(0, max).map(x => '  - ' + x.inv + ' : ' + x.msg + (x.seed !== undefined ? ' [graine ' + x.seed + ']' : '') +
    (x.dep ? ' départ ' + x.dep : '') + (x.params ? '\n      paramètres ' + JSON.stringify(x.params) : ''));
  return list.length + ' violation(s)\n' + lines.join('\n') + '\nExemples :\n' + ex.join('\n');
}

module.exports = { FULL, num, OUT_DIR, outFile, summarize };
