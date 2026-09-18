// Requêtes HTTP BRUTES vers le serveur local (chemin envoyé tel quel, sans normalisation : indispensable pour tester
// « /%64ata/… » ou « /js/../data/… »), avec abandon volontaire et client qui ne lit pas sa réponse.
'use strict';
const net = require('net');

function raw(port, reqText, opts){
  opts = opts || {};
  return new Promise(resolve => {
    const t0 = performance.now();
    const s = net.connect(port, '127.0.0.1');
    let chunks = [], done = false;
    function finish(err){
      if(done) return; done = true;
      const buf = Buffer.concat(chunks);
      const i = buf.indexOf('\r\n\r\n');
      const head = (i >= 0 ? buf.slice(0, i) : buf).toString('latin1');
      const lines = head.split('\r\n');
      const m = /^HTTP\/1\.\d (\d+)/.exec(lines[0] || '');
      const headers = {};
      lines.slice(1).forEach(l => { const k = l.indexOf(':'); if(k > 0) headers[l.slice(0, k).toLowerCase()] = l.slice(k + 1).trim(); });
      let body = i >= 0 ? buf.slice(i + 4) : Buffer.alloc(0);
      if(/chunked/i.test(headers['transfer-encoding'] || '')) body = dechunk(body);
      resolve({ status: m ? +m[1] : 0, headers, body, ms: Math.round(performance.now() - t0), err: err && err.message });
      s.destroy();
    }
    s.on('data', d => { chunks.push(d); });
    s.on('end', () => finish());
    s.on('error', e => finish(e));
    s.setTimeout(opts.timeout || 60000, () => finish(new Error('timeout')));
    s.write(reqText);
    if(opts.abortAfterMs != null) setTimeout(() => finish(new Error('abandon volontaire')), opts.abortAfterMs);
  });
}
function dechunk(b){
  const out = [];
  let p = 0;
  while(p < b.length){
    const e = b.indexOf('\r\n', p); if(e < 0) break;
    const n = parseInt(b.slice(p, e).toString('latin1'), 16); if(!(n > 0)) break;
    out.push(b.slice(e + 2, e + 2 + n)); p = e + 2 + n + 2;
  }
  return Buffer.concat(out);
}

// Adresse fictive distincte par appel (X-Forwarded-For, dernière adresse retenue par le serveur, « trust proxy 1 ») :
// chaque requête a ses propres quotas, sauf quand un test veut justement les partager.
let ipCounter = 1;
function freshIp(){ const n = ipCounter++; return '10.' + (200 + ((n >> 16) & 31)) + '.' + ((n >> 8) & 255) + '.' + (n & 255); }

function client(port){
  const hdr = (ip, extra) => 'X-Forwarded-For: ' + (ip || freshIp()) + '\r\n' + (extra || '');
  const get = (path, o) => { o = o || {}; return raw(port, 'GET ' + path + ' HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n' + hdr(o.ip, o.headers) + '\r\n', o); };
  const method = (m, path, o) => { o = o || {}; return raw(port, m + ' ' + path + ' HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n' + hdr(o.ip, o.headers) + '\r\n', o); };
  const post = (path, body, o) => {
    o = o || {};
    const b = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const head = 'POST ' + path + ' HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nContent-Type: ' + (o.contentType || 'application/json') +
      '\r\nContent-Length: ' + b.length + '\r\n' + hdr(o.ip, o.headers) + '\r\n';
    return raw(port, Buffer.concat([Buffer.from(head, 'latin1'), b]), o);
  };
  // POST qui attend son tour si le serveur répond « busy » (budget de calcul global, créneau PDF) ou 429 (quota de
  // l'adresse : nouvelle adresse). Les autres statuts sont rendus tels quels.
  const postPatient = async (path, body, o) => {
    o = Object.assign({}, o);
    const deadline = Date.now() + (o.maxWaitMs || 120000);
    for(;;){
      const r = await post(path, body, o);
      if((r.status !== 503 && r.status !== 429) || Date.now() > deadline) return r;
      const wait = Math.min(15, Math.max(1, Number(r.headers['retry-after']) || 2));
      await new Promise(res => setTimeout(res, wait * 1000));
      o.ip = freshIp();
    }
  };
  return { get, method, post, postPatient, raw: (t, o) => raw(port, t, o) };
}

const SECURITY_HEADERS = ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy'];
function missingSecurityHeaders(h){ return SECURITY_HEADERS.filter(k => !h[k]); }

module.exports = { client, freshIp, missingSecurityHeaders, SECURITY_HEADERS };
