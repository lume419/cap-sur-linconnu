// Bornes de recharge pour véhicules électriques (septembre 2026) : export public d'Open Charge Map
// (github.com/openchargemap/ocm-export, un fichier JSON par borne, rangé par pays), lu en flux dans l'archive
// tar.gz sans l'extraire. Résultat : data/charging-stations.txt (« lat,lon » arrondis à 4 décimales, dédoublonnés),
// lu par le moteur au démarrage (voir evPlan dans lib/trip-engine.js).
//
// POURQUOI PAS OPENSTREETMAP — première source envisagée (amenity=charging_station via l'API Overpass) : les instances
// publiques étaient saturées (504, délais dépassés) ; à ~2-3 min par pays, l'extraction des 250 codes aurait pris la
// journée, et la requête mondiale unique a été refusée (« server too busy »). Open Charge Map publie un export complet.
//
// FILTRES — seules les bornes réutilisables et utiles sur la route sont gardées :
//   - licence : fournisseur dont les données sont sous licence ouverte (referencedata.json, IsOpenDataLicensed) et sans
//     clause non commerciale (« NonCommercial », « by-nc ») — CC BY 4.0 des contributeurs OCM, domaine public NREL (US),
//     Open Government Licence (UK), CC BY NOBIL (Norvège), Bundesnetzagentur (DE), data.gouv.fr (FR), CC0 des
//     opérateurs… ;
//   - publication : fiche publiée (SubmissionStatus « IsLive ») ;
//   - état : en service ou inconnu (écarte « Not Operational », « Planned », « Removed ») ;
//   - accès : public, public avec abonnement ou paiement sur place, ou inconnu (écarte les bornes privées).
//
// Usage : node scripts/fetch-charging-stations.js [--download]
//   --download  retélécharge l'archive (scripts/osm/ocm/ocm-export.tar.gz, non commitée)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, 'osm', 'ocm');
const ARCHIVE = path.join(DIR, 'ocm-export.tar.gz');
const URL = 'https://codeload.github.com/openchargemap/ocm-export/tar.gz/refs/heads/main';
const FINAL = path.join(__dirname, '..', 'data', 'charging-stations.txt');
const USAGE_OK = new Set([0, 1, 4, 5, 7]);

async function download(){
  fs.mkdirSync(DIR, { recursive: true });
  const res = await fetch(URL, { headers: { 'User-Agent': 'cap-sur-linconnu/1.0 (road trip generator)' } });
  if(!res.ok) throw new Error('téléchargement HTTP ' + res.status);
  fs.writeFileSync(ARCHIVE, Buffer.from(await res.arrayBuffer()));
}

// Lecteur tar minimal en flux : appelle onFile(nom, contenu) pour chaque fichier ordinaire.
function readTarGz(file, onFile){
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0), need = null, name = null, pad = 0, skip = 0;
    const gunzip = zlib.createGunzip();
    gunzip.on('data', chunk => {
      buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
      for(;;){
        if(skip){ const n = Math.min(skip, buf.length); buf = buf.subarray(n); skip -= n; if(skip) return; }
        if(need === null){
          if(buf.length < 512) return;
          const h = buf.subarray(0, 512); buf = buf.subarray(512);
          if(h.every(b => b === 0)) continue;
          const str = (a, b) => h.subarray(a, b).toString('utf8').replace(/\0.*$/s, '');
          const size = parseInt(str(124, 136).trim() || '0', 8);
          const prefix = str(345, 500);
          name = (prefix ? prefix + '/' : '') + str(0, 100);
          const type = String.fromCharCode(h[156] || 48);
          pad = (512 - (size % 512)) % 512;
          if(type === '0' || type === '\0'){ need = size; } else { skip = size + pad; }
          continue;
        }
        if(buf.length < need) return;
        onFile(name, buf.subarray(0, need));
        buf = buf.subarray(need); need = null; skip = pad;
      }
    });
    gunzip.on('end', resolve);
    gunzip.on('error', reject);
    fs.createReadStream(file).pipe(gunzip);
  });
}

(async () => {
  if(process.argv.includes('--download') || !fs.existsSync(ARCHIVE)) await download();
  // Table de référence d'abord (fournisseurs, statuts)
  let ref = null;
  await readTarGz(ARCHIVE, (name, data) => { if(/\/data\/referencedata\.json$/.test(name)) ref = JSON.parse(data.toString('utf8')); });
  if(!ref) throw new Error('referencedata.json absent de l\'archive');
  const providerOk = new Set(ref.DataProviders.filter(d => d.IsOpenDataLicensed === true && !/non-?commercial|by-nc/i.test(d.License || '')).map(d => d.ID));
  const statusBad = new Set(ref.StatusTypes.filter(s => s.IsOperational === false).map(s => s.ID));
  const submissionLive = new Set(ref.SubmissionStatusTypes.filter(s => s.IsLive).map(s => s.ID));

  const seen = new Set(), stats = { files: 0, kept: 0, license: 0, status: 0, usage: 0, submission: 0, coords: 0 };
  const byCountry = {};
  await readTarGz(ARCHIVE, (name, data) => {
    const m = name.match(/\/data\/([A-Z]{2})\/[^/]+\.json$/);
    if(!m) return;
    stats.files++;
    let poi; try { poi = JSON.parse(data.toString('utf8')); } catch(e){ return; }
    if(!providerOk.has(poi.DataProviderID)){ stats.license++; return; }
    if(poi.SubmissionStatusTypeID != null && !submissionLive.has(poi.SubmissionStatusTypeID)){ stats.submission++; return; }
    if(poi.StatusTypeID != null && statusBad.has(poi.StatusTypeID)){ stats.status++; return; }
    if(poi.UsageTypeID != null && !USAGE_OK.has(poi.UsageTypeID)){ stats.usage++; return; }
    const a = poi.AddressInfo || {};
    const lat = Number(a.Latitude), lon = Number(a.Longitude);
    if(!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)){ stats.coords++; return; }
    const key = lat.toFixed(4) + ',' + lon.toFixed(4);
    if(seen.has(key)) return;
    seen.add(key); stats.kept++;
    byCountry[m[1]] = (byCountry[m[1]] || 0) + 1;
  });
  fs.mkdirSync(path.dirname(FINAL), { recursive: true });
  fs.writeFileSync(FINAL, [...seen].sort().join('\n') + '\n');
  console.log(JSON.stringify(stats));
  console.log('pays : ' + Object.keys(byCountry).length + ' — ' + Object.entries(byCountry).sort((x, y) => y[1] - x[1]).slice(0, 25).map(e => e[0] + ' ' + e[1]).join(', '));
  console.log('TOTAL ' + seen.size + ' bornes -> ' + FINAL);
})().catch(e => { console.error(e); process.exit(1); });
