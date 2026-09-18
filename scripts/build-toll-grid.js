// Grille des VOIES À PÉAGE réelles (7e audit, 18/09/2026) — data/toll-grid.json, lue par lib/toll-grid.js.
//
// POURQUOI : le moteur facturait un péage au kilomètre sur TOUTE étape d'au moins 60 km dans un pays « à péage », au
// barème de ce pays. Un Bastia → Porto-Vecchio (Corse, aucune autoroute), un Brest → Quimper (Bretagne, gratuite), un
// trajet au fin fond de l'Anatolie recevaient une facture de péage inventée. Aucune source ne justifiait ce montant.
//
// CE QUE FAIT CE SCRIPT : il demande à OpenStreetMap (Overpass) les voies portant `toll=yes` (autoroutes et voies
// rapides payantes, ponts et tunnels à péage) et enregistre les CASES de 0,25° (~28 km) où elles passent, avec le
// pays. Le moteur (lib/trip-engine.js) échantillonne ensuite le trait de chaque étape : seuls les kilomètres dont la
// case contient réellement une voie à péage sont facturés, au barème du pays de CETTE case — ce qui règle au passage
// les étapes transfrontalières, sans partage arbitraire entre les deux pays.
//
// COMMENT (et pourquoi comme ça) : les requêtes « tout un pays » (area["ISO3166-1"=...]) font répondre les serveurs
// Overpass publics en 504 dès que le réseau est dense — la France n'est jamais passée. Le script interroge donc des
// TUILES géographiques (TILE_DEG) sans filtre de pays, ce qui est beaucoup plus léger, puis attribue chaque case au
// pays d'après les lieux du dépôt eux-mêmes (public/data/communes*.txt) : aucune requête supplémentaire, et une
// attribution cohérente avec le reste du moteur.
//
// Usage : node scripts/build-toll-grid.js [FR ES ...]   (sans argument : tous les pays de TOLL_RATE_BY_COUNTRY)
// Les tuiles déjà obtenues sont conservées d'une exécution à l'autre (data/toll-grid.json est complété, jamais vidé) :
// le script peut être relancé après un échec réseau sans tout refaire.
const fs = require('fs');
const path = require('path');
const TripData = require('../public/js/trip-data.js');

const OUT = path.join(__dirname, '..', 'data', 'toll-grid.json');
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
// Miroirs Overpass, dans l'ordre d'essai. Relevé du 18/09/2026 sur une tuile de 2° du sud-est de la France :
// maps.mail.ru répond en 41 s, private.coffee et kumi.systems en 504 (surcharge), overpass-api.de n'accepte pas la
// connexion depuis cette machine, osm.ch ne sert que la Suisse. Aucune donnée de visiteur n'est envoyée : seulement
// un rectangle de coordonnées. Si l'ordre ne convient plus, il suffit de le changer ici.
const ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];
const UA = 'cap-sur-linconnu/build-toll-grid (générateur de road-trips, https://github.com/lume419/cap-sur-linconnu)';
const CELL_DEG = 0.25;  // finesse de la grille enregistrée (~28 km)
const TILE_DEG = 2;     // taille des tuiles interrogées (une requête chacune) — 4° était systématiquement refusé
                        // sur l'Europe de l'Ouest, où le réseau à péage est le plus dense.
const PAUSE_MS = 4000;  // entre deux requêtes : service public bénévole
const MIN_TILE_DEG = 0.5; // en deçà, on n'insiste plus : la zone est refusée pour une autre raison qu'un excès de surface
// Voies à péage : `toll=yes` porté par la voie, et classées « motorway » seulement. Constaté le 18/09/2026 : les
// miroirs Overpass publics répondent 504 dès qu'on élargit d'un cran (Rhône-Alpes : 105 s et 9 788 voies pour
// « motorway » seul, 504 en ajoutant « trunk »). C'est une limite ASSUMÉE : une voie à péage classée « trunk » ou
// « primary » — certains ponts et tunnels payants — peut manquer, auquel cas aucun péage n'est facturé là, jamais
// l'inverse. Les grands réseaux concédés, eux, sont tous en « motorway ». Les bretelles (`_link`) sont écartées :
// courtes, elles tombent toujours dans la case de la voie qu'elles rejoignent.
const HIGHWAYS = 'motorway';
const HIGHWAYS_LIGHT = 'motorway';

function query(box, hw){
  return '[out:json][timeout:240][bbox:' + box.join(',') + '];' +
    'way["toll"="yes"]["highway"~"^(' + (hw || HIGHWAYS) + ')$"];out center;';
}
const cellKey = (lat, lon) => Math.floor(lat / CELL_DEG) + ',' + Math.floor(lon / CELL_DEG);

// Chaque serveur est essayé avec la requête complète PUIS avec les autoroutes seules, avant de passer au suivant :
// une tuile dense est refusée par tous les serveurs de la même façon, et enchaîner les trois délais d'attente avant
// d'alléger la requête faisait perdre un quart d'heure par tuile.
// Un seul flux, et toujours le miroir le plus rapide en premier : mesuré le 18/09/2026, maps.mail.ru répond en
// séquentiel à environ une tuile par minute sans erreur, là où deux requêtes en parallèle provoquent un 504 une fois
// sur deux, et où une rotation entre miroirs retombe sur des serveurs deux à trois fois plus lents.
async function ask(box, hw){
  let lastErr;
  for(const url of ENDPOINTS){
    for(const highways of (hw ? [hw] : [HIGHWAYS, HIGHWAYS_LIGHT])){
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
          body: 'data=' + encodeURIComponent(query(box, highways)),
          signal: AbortSignal.timeout(170000)
        });
        if(!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if(!j.elements) throw new Error('réponse sans éléments');
        if(highways === HIGHWAYS_LIGHT) console.log('    (autoroutes seules)');
        return j.elements;
      } catch(e){ lastErr = e; console.log('    ' + url.split('/')[2] + ' [' + highways + '] : ' + e.message); }
    }
  }
  throw lastErr;
}

// Case -> pays, d'après les lieux du dépôt. Sert à attribuer une voie à péage au bon barème, y compris quand la
// tuile interrogée déborde sur un pays voisin.
function countryByCell(countries){
  const map = new Map();
  for(const cc of countries){
    const f = path.join(DATA_DIR, cc === 'FR' ? 'communes.txt' : 'communes-' + cc.toLowerCase() + '.txt');
    if(!fs.existsSync(f)){ console.log('(pas de fichier de lieux pour ' + cc + ')'); continue; }
    for(const line of fs.readFileSync(f, 'utf8').split('\n')){
      const p = line.split(';');
      if(p.length < 5) continue;
      const ll = p[1].split(',');
      const lat = +ll[1], lon = +ll[0];
      if(!isFinite(lat) || !isFinite(lon)) continue;
      const k = cellKey(lat, lon);
      if(!map.has(k)) map.set(k, cc);
    }
  }
  return map;
}
// Tuiles à interroger pour un pays : celles qui contiennent réellement des lieux habités de ce pays, et non tout le
// rectangle englobant — l'emprise de la France, outre-mer compris, va de la Polynésie à la Nouvelle-Calédonie et
// produisait 1 740 tuiles pour 9 000 km d'autoroutes.
function tilesFor(cc){
  const f = path.join(DATA_DIR, cc === 'FR' ? 'communes.txt' : 'communes-' + cc.toLowerCase() + '.txt');
  if(!fs.existsSync(f)) return [];
  const tiles = new Map();
  for(const line of fs.readFileSync(f, 'utf8').split('\n')){
    const p = line.split(';');
    if(p.length < 5) continue;
    const ll = p[1].split(',');
    const lat = +ll[1], lon = +ll[0];
    if(!isFinite(lat) || !isFinite(lon)) continue;
    const la = Math.floor(lat / TILE_DEG) * TILE_DEG, lo = Math.floor(lon / TILE_DEG) * TILE_DEG;
    const key = la + ',' + lo;
    if(!tiles.has(key)) tiles.set(key, [la, lo, la + TILE_DEG, lo + TILE_DEG]);
  }
  return Array.from(tiles.values());
}

(async () => {
  const wanted = process.argv.slice(2).map(s => s.toUpperCase());
  const tollCountries = Object.keys(TripData.TOLL_RATE_BY_COUNTRY);
  const countries = tollCountries.filter(cc => !wanted.length || wanted.includes(cc));
  let out = { source: 'OpenStreetMap (Overpass, way[toll=yes]) — ODbL', builtAt: '', cellDeg: CELL_DEG, countries: {}, cells: {}, tilesDone: [] };
  try {
    const old = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    if(old.cellDeg === CELL_DEG && old.cells){ out = old; out.tilesDone = (old.tilesDone || []).filter(function(t){ var p = t.split(',').map(Number); return Math.abs(p[2] - p[0] - TILE_DEG) < 0.001; }); }
  } catch(e){ /* premier passage */ }

  console.log('attribution des cases aux pays depuis les lieux du dépôt…');
  const cellCountry = countryByCell(tollCountries);
  console.log(cellCountry.size + ' cases habitées connues pour les ' + tollCountries.length + ' pays à péage.');

  // Tuiles à interroger : celles des pays demandés, sans doublon, sans celles déjà obtenues.
  const seen = new Set(out.tilesDone);
  const todo = [];
  for(const cc of countries){
    for(const t of tilesFor(cc)){
      const key = t.join(',');
      if(seen.has(key)) continue;
      seen.add(key);
      todo.push(t);
    }
  }
  console.log(todo.length + ' tuiles à interroger (' + out.tilesDone.length + ' déjà obtenues).');

  // Une tuile refusée est redécoupée en quatre, jusqu'à MIN_TILE_DEG : la Provence ou la vallée du Rhône passent en
  // quarts là où le carré de 4° est systématiquement refusé.
  async function collect(box, depth){
    try { return await ask(box); }
    catch(e){
      const taille = box[2] - box[0];
      if(taille <= MIN_TILE_DEG || depth > 3) throw e;
      const mi = (box[0] + box[2]) / 2, mj = (box[1] + box[3]) / 2;
      const quarts = [[box[0], box[1], mi, mj], [box[0], mj, mi, box[3]], [mi, box[1], box[2], mj], [mi, mj, box[2], box[3]]];
      console.log('    tuile refusée : découpée en quatre (' + taille / 2 + '°)');
      let out = [], ok = 0;
      for(const q of quarts){
        await new Promise(r => setTimeout(r, PAUSE_MS));
        try { const els = await collect(q, depth + 1); out = out.concat(els); ok++; }
        catch(e2){ console.log('    quart ' + q.join(',') + ' : abandonné'); }
      }
      if(!ok) throw e;
      return out;
    }
  }

  // Deux tuiles à la fois : les miroirs Overpass acceptent deux créneaux par adresse, et une tuile prend de 40 s à
  // plusieurs minutes. Au-delà, on prendrait la place d'autres utilisateurs d'un service public.
  let done = 0, next = 0;
  async function worker(){
    while(next < todo.length){
      const box = todo[next++];
      const num = ++done;
      let elements;
      // ask() gère déjà le repli « autoroutes seules » serveur par serveur ; collect() réduit la surface si besoin.
      try { elements = await collect(box, 0); }
      catch(e){ console.log('[' + num + '/' + todo.length + '] ' + box.join(',') + ' : échec, tuile à refaire plus tard'); await new Promise(r => setTimeout(r, PAUSE_MS)); continue; }
      let added = 0, horsPays = 0;
      for(const el of elements){
        const c = el.center || el;
        if(typeof c.lat !== 'number' || typeof c.lon !== 'number') continue;
        const k = cellKey(c.lat, c.lon);
        if(out.cells[k]) continue;
        // Pays de la case, sinon d'une case voisine (voie à péage en limite d'habitat : pont, tunnel, viaduc).
        let cc = cellCountry.get(k);
        if(!cc){
          const [i, j] = k.split(',').map(Number);
          for(let di = -1; di <= 1 && !cc; di++) for(let dj = -1; dj <= 1 && !cc; dj++) cc = cellCountry.get((i + di) + ',' + (j + dj));
        }
        if(!cc){ horsPays++; continue; } // hors des pays dont on connaît un barème : rien à facturer
        out.cells[k] = cc;
        added++;
      }
      out.tilesDone.push(box.join(','));
      console.log('[' + num + '/' + todo.length + '] ' + box.join(',') + ' : ' + elements.length + ' voies, ' + added + ' cases ajoutées' + (horsPays ? ' (' + horsPays + ' hors pays à barème)' : ''));
      // Écriture à chaque tuile : une coupure réseau ne fait pas perdre le travail déjà fait.
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      out.builtAt = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(OUT, JSON.stringify(out));
      await new Promise(r => setTimeout(r, PAUSE_MS));
    }
  }
  // Un seul flux : deux requêtes simultanées font répondre 504 au miroir une fois sur deux (mesuré le 18/09/2026),
  // ce qui coûte plus de temps en réessais que le parallélisme n'en fait gagner.
  await worker();

  const parCc = {};
  for(const k of Object.keys(out.cells)) parCc[out.cells[k]] = (parCc[out.cells[k]] || 0) + 1;
  out.countries = parCc;
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log('\n' + Object.keys(out.cells).length + ' cases au total → ' + OUT + ' (' + Math.round(fs.statSync(OUT).size / 1024) + ' Ko)');
  console.log(Object.keys(parCc).sort().map(cc => cc + ' ' + parCc[cc]).join(' | '));
  const vides = tollCountries.filter(cc => !parCc[cc]);
  if(vides.length) console.log('AUCUNE voie à péage trouvée pour : ' + vides.join(', ') + ' — aucun péage ne sera facturé dans ces pays.');
})();
