// Préchargé dans le serveur de test (node -r tests/helpers/mock-fetch.js server.js) : remplace fetch pour qu'AUCUN
// service tiers ne soit sollicité (Overpass, Wikipédia, Wikidata, Visorando…). Réponses plausibles par défaut.
// Comportement piloté par le fichier JSON MOCK_CTRL (relu à chaque appel) :
//   { "overpass": "ok" | "hang" | "reset" | "status:500" | "badjson", "delayMs": { "overpass": 3000 }, … }
// Chaque appel sortant est ajouté en JSON dans MOCK_LOG ({ t, s, url, method }).
'use strict';
const fs = require('fs');
const CTRL = process.env.MOCK_CTRL;
const LOG = process.env.MOCK_LOG;
function ctrl(){ try { return JSON.parse(fs.readFileSync(CTRL, 'utf8')); } catch(e){ return {}; } }
function log(o){ if(LOG) try { fs.appendFileSync(LOG, JSON.stringify(o) + '\n'); } catch(e){} }
function svc(url){
  if(/overpass/.test(url)) return 'overpass';
  if(/wikidata/.test(url)) return 'wikidata';
  if(/visorando/.test(url)) return 'visorando';
  if(/wikipedia\.org\/w\/api\.php/.test(url)) return 'wikitext';
  if(/wikipedia\.org/.test(url)) return 'wiki';
  return 'other';
}
function sleep(ms, signal){
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if(signal){
      const abort = () => { clearTimeout(t); const e = new Error('This operation was aborted'); e.name = 'AbortError'; reject(e); };
      if(signal.aborted) return abort();
      signal.addEventListener('abort', abort, { once: true });
    }
  });
}
global.fetch = async function(url, opts){
  url = String(url); opts = opts || {};
  const s = svc(url);
  const c = ctrl();
  const mode = c[s] || 'ok';
  log({ t: Date.now(), s, url: url.slice(0, 300), method: opts.method || 'GET', mode });
  const delay = (c.delayMs && c.delayMs[s]) || 0;
  if(delay) await sleep(delay, opts.signal);
  if(mode === 'hang') await sleep(10 * 60 * 1000, opts.signal);
  if(mode === 'reset') throw new TypeError('fetch failed');
  const m = /^status:(\d+)$/.exec(mode);
  if(m) return new Response('err', { status: +m[1] });
  if(mode === 'badjson') return new Response('{not json', { status: 200, headers: { 'content-type': 'application/json' } });
  const near = c.near || { lat: 45.76, lon: 4.83 };
  if(s === 'wiki'){
    const title = decodeURIComponent(url.split('/summary/')[1] || 'X');
    return Response.json({ type: 'standard', title, coordinates: { lat: near.lat, lon: near.lon }, wikibase_item: 'Q90',
      thumbnail: { source: 'https://upload.wikimedia.org/t.jpg' }, originalimage: { source: 'https://upload.wikimedia.org/o.jpg' },
      content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/' + encodeURIComponent(title) } } });
  }
  if(s === 'wikidata') return Response.json({ entities: { Q90: { sitelinks: { frwiki: { title: 'Paris' } } } } });
  if(s === 'wikitext') return Response.json({ parse: { wikitext: '== Lieux et monuments ==\n* Église Saint-Pierre\n* [[Château de Test]]\n' } });
  if(s === 'overpass') return Response.json({ elements: [
    { type: 'node', lat: near.lat + 0.01, lon: near.lon, tags: { name: 'Musée X', tourism: 'museum', wikipedia: 'fr:Musée X' } },
    { type: 'relation', id: 123, center: { lat: near.lat, lon: near.lon + 0.01 }, tags: { name: 'Boucle', route: 'hiking', network: 'lwn', distance: '12' } }
  ] });
  if(s === 'visorando') return new Response('<html></html>', { status: 200 });
  return new Response('no', { status: 404 });
};
