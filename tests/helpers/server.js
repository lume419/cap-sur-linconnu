// Démarrage et arrêt du VRAI server.js pour les tests : port libre (variable PORT), fetch simulé préchargé (aucun appel
// externe), journal dans le dossier temporaire des tests. L'arrêt tue tout l'arbre de processus, y compris si le
// processus de test se termine sur une erreur.
'use strict';
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { outFile } = require('./config.js');

const ROOT = path.resolve(__dirname, '..', '..');

function freePort(){
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

function killTree(child){
  if(!child || child.exitCode !== null || child.killed) return;
  if(process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { child.kill('SIGKILL'); } catch(e){} }
}

async function startServer(opts){
  opts = opts || {};
  const port = await freePort();
  const ctrl = outFile('mock-control-' + port + '.json');
  const log = outFile('mock-outbound-' + port + '.log');
  const serverLog = outFile('server-' + port + '.log');
  fs.writeFileSync(ctrl, '{}');
  fs.writeFileSync(log, '');
  const out = fs.openSync(serverLog, 'w');
  const child = spawn(process.execPath, ['--max-old-space-size=8192', '-r', path.join(__dirname, 'mock-fetch.js'), path.join(ROOT, 'server.js')], {
    cwd: ROOT,
    env: Object.assign({}, process.env, { PORT: String(port), MOCK_CTRL: ctrl, MOCK_LOG: log, NODE_OPTIONS: '' }),
    stdio: ['ignore', out, out],
    windowsHide: true
  });
  const onExit = () => killTree(child);
  process.on('exit', onExit);
  const srv = {
    port, ctrl, log, serverLog, child,
    setMock(o){ fs.writeFileSync(ctrl, JSON.stringify(o || {})); },
    outbound(since, service){
      return fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => x.t >= (since || 0) && (!service || x.s === service));
    },
    logTail(n){ try { return fs.readFileSync(serverLog, 'utf8').split('\n').slice(-(n || 30)).join('\n'); } catch(e){ return ''; } },
    stop(){ process.removeListener('exit', onExit); killTree(child); try { fs.closeSync(out); } catch(e){} }
  };
  // Prêt : moteur chargé, polices du PDF lues et gros fichiers précompressés (sinon les premières mesures de durée
  // incluraient ces calculs de démarrage).
  const deadline = Date.now() + (opts.readyTimeoutMs || 900000);
  let last = null, n = 0;
  while(Date.now() < deadline){
    if(child.exitCode !== null) throw new Error('server.js s\'est arrêté (code ' + child.exitCode + ') :\n' + srv.logTail());
    try {
      n++;
      const r = await fetch('http://127.0.0.1:' + port + '/api/status', { headers: { 'X-Forwarded-For': '10.1.' + ((n >> 8) & 255) + '.' + (n & 255) } });
      if(r.ok){ last = await r.json(); if(last.tripsReady && last.pdfFonts && last.precompressed) return srv; }
    } catch(e){}
    await new Promise(r => setTimeout(r, 1000));
  }
  srv.stop();
  throw new Error('server.js pas prêt à temps (dernier état ' + JSON.stringify(last) + ') :\n' + srv.logTail());
}

module.exports = { startServer };
