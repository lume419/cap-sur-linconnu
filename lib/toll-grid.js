// Où le péage au kilomètre existe VRAIMENT (7e audit, 18/09/2026) — lecture de data/toll-grid.json, construit par
// scripts/build-toll-grid.js depuis OpenStreetMap (voies `toll=yes`, licence ODbL).
//
// Avant : toute étape d'au moins 60 km dans un pays « à péage » était facturée au barème de ce pays, sur la totalité
// de sa distance. Bastia → Porto-Vecchio (aucune autoroute en Corse), Brest → Quimper (Bretagne gratuite) ou une étape
// de l'est anatolien recevaient un montant inventé.
// Maintenant : le trait de l'étape est échantillonné, et seuls les kilomètres dont la case de 0,25° (~28 km) contient
// réellement une voie à péage sont facturés — au barème du pays de CETTE case, ce qui traite au passage les étapes
// transfrontalières sans partage arbitraire.
//
// Ce que la méthode ne sait pas faire, et qui est assumé : elle ne calcule pas d'itinéraire. Elle dit qu'un péage est
// PLAUSIBLE sur cette portion, pas qu'il sera payé — d'où la phrase « estimation au kilomètre » affichée avec le
// montant ('toll.estimateNote'). Fichier absent : aucun péage n'est facturé nulle part (jamais de montant inventé).
const fs = require('fs');
const path = require('path');

let GRID = null; // Map « i,j » -> code pays, ou false si la grille est indisponible
let CELL = 0.25;
let STATUS = 'non chargée';

function load(){
  if(GRID !== null) return GRID;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'toll-grid.json'), 'utf8'));
    if(!raw || !raw.cells || typeof raw.cells !== 'object') throw new Error('fichier sans cases');
    const keys = Object.keys(raw.cells);
    if(!keys.length) throw new Error('aucune case');
    if(!(raw.cellDeg > 0)) throw new Error('taille de case absente');
    CELL = raw.cellDeg;
    GRID = new Map();
    for(const k of keys){
      const cc = raw.cells[k];
      if(typeof cc === 'string' && /^[A-Z]{2}$/.test(cc)) GRID.set(k, cc);
    }
    // Pays comptés sur les cases elles-mêmes : le récapitulatif par pays du fichier n'est écrit qu'à la fin d'une
    // construction complète, et serait à zéro après une reprise partielle.
    const pays = new Set(GRID.values());
    STATUS = GRID.size + ' cases, ' + pays.size + ' pays (' + (raw.builtAt || 'date inconnue') + ')';
  } catch(e){
    console.warn('[toll-grid] grille des voies à péage indisponible (' +
      (e.code === 'ENOENT' ? 'data/toll-grid.json absent, lancer scripts/build-toll-grid.js' : e.message) +
      ') : aucun péage ne sera estimé.');
    STATUS = 'indisponible (' + (e.code || e.message) + ')';
    GRID = false;
  }
  return GRID;
}

// Case contenant le point, ou l'une de ses 8 voisines : une tolérance d'environ 28 km autour du trait.
// Pourquoi cette tolérance : le moteur ne calcule pas d'itinéraire, il suit le trait à vol d'oiseau, qui s'écarte de
// l'autoroute réelle — entre Lyon et Marseille, la ligne droite passe 20 km à l'est de l'A7, donc dans des cases sans
// voie à péage. Mesuré sur les 38 liaisons de référence (18/09/2026), rapport montant estimé / prix officiel :
//   - case exacte seule : médiane 0,54 (q25 0,35 ; q75 0,75) — le péage était sous-estimé de moitié ;
//   - case ou voisine   : médiane 0,97 (q25 0,86 ; q75 1,07).
// La contrepartie, assumée : un trajet gratuit qui longe une autoroute payante peut se voir attribuer quelques
// kilomètres. Une région sans aucune autoroute à péage (Corse, pointe bretonne, La Réunion) reste bien à 0 €.
function cellCountry(lat, lon){
  const g = load();
  if(!g) return null;
  const i = Math.floor(lat / CELL), j = Math.floor(lon / CELL);
  const ici = g.get(i + ',' + j);
  if(ici) return ici;
  for(let di = -1; di <= 1; di++){
    for(let dj = -1; dj <= 1; dj++){
      const cc = g.get((i + di) + ',' + (j + dj));
      if(cc) return cc;
    }
  }
  return null;
}

// Répartition des kilomètres d'une étape entre les pays dont une voie à péage est présente sur le trajet.
// Retour : [{ country, km }], vide si aucune portion n'est près d'une voie à péage (ou si la grille manque).
// roadKm est la distance PAR LA ROUTE de l'étape : l'échantillonnage suit le trait à vol d'oiseau, mais les kilomètres
// répartis sont bien ceux de la route (la proportion, elle, est celle du trait).
const SAMPLE_KM = 10;
const MAX_SAMPLES = 200;
function tolledParts(fromLat, fromLon, toLat, toLon, roadKm){
  if(!load() || !(roadKm > 0)) return [];
  const n = Math.max(4, Math.min(MAX_SAMPLES, Math.round(roadKm / SAMPLE_KM)));
  const byCountry = new Map();
  let hits = 0;
  // Interpolation linéaire des coordonnées : elle serait fausse pour une étape franchissant l'antiméridien (180°),
  // mais aucun des pays à barème kilométrique ne s'en approche. Le pire cas resterait d'échantillonner des cases sans
  // voie à péage, donc de ne rien facturer — jamais de facturer à tort.
  for(let i = 0; i < n; i++){
    const f = (i + 0.5) / n; // milieu de chaque tronçon : pas de poids double aux extrémités
    const cc = cellCountry(fromLat + (toLat - fromLat) * f, fromLon + (toLon - fromLon) * f);
    if(!cc) continue;
    hits++;
    byCountry.set(cc, (byCountry.get(cc) || 0) + 1);
  }
  if(!hits) return [];
  const out = [];
  byCountry.forEach(function(count, cc){ out.push({ country: cc, km: roadKm * count / n }); });
  return out;
}

// État pour GET /api/status.
function status(){ load(); return STATUS; }

module.exports = { tolledParts, cellCountry, status, available: () => !!load() };
