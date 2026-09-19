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
// Cases où passe aussi une AUTOROUTE GRATUITE (freeCells, 11e audit du 19/09/2026, voir scripts/build-toll-grid.js) :
// « ambiguës » quand elles portent aussi une voie à péage — le trajet peut prendre l'une ou l'autre. Ignorées par la
// borne basse (exclues de « probable »), gardées par la borne haute. Absentes du fichier : aucune case ambiguë.
let FREE = new Set();
let FREE_IGNORED = []; // pays sans deux cases payantes sûres (voir load)

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
    FREE = new Set();
    if(raw.freeCells && typeof raw.freeCells === 'object') for(const k of Object.keys(raw.freeCells)) FREE.add(k);
    // Pays SANS case payante sûre (12e audit du 19/09/2026) : toutes les cases à péage de la Macédoine du Nord (13),
    // d'Israël (6) et de la Tunisie (8) portent aussi une autoroute gratuite, le Sénégal n'a qu'une case sûre — la borne
    // basse n'y dépasse 0 € que par le pont des cases ambiguës. Ignorer la couche dans ces pays a été essayé puis écarté :
    // en Israël, l'ambiguïté est réelle (autoroutes 2 et 4 gratuites le long de la 6 payante : Tel Aviv → Haïfa passait à
    // « 6,7 € probable »), et rien dans les données ne distingue ce cas d'un tronçon payant simplement non tagué. Limite
    // documentée (README, 12e passe) ; ces pays sont listés par /api/status.
    const surs = new Map();
    for(const [k, cc] of GRID) if(!FREE.has(k)) surs.set(cc, (surs.get(cc) || 0) + 1);
    FREE_IGNORED = Array.from(new Set(GRID.values())).filter(cc => (surs.get(cc) || 0) < MIN_RUN_CELLS_LOW).sort();
    const pays = new Set(GRID.values());
    STATUS = GRID.size + ' cases, ' + pays.size + ' pays (' + (raw.builtAt || 'date inconnue') + ')' + (FREE.size ? ', ' + FREE.size + ' cases d\'autoroute gratuite' : '') +
      (FREE_IGNORED.length ? ' (borne basse souvent nulle, toutes cases ambiguës : ' + FREE_IGNORED.join(', ') + ')' : '');
  } catch(e){
    console.warn('[toll-grid] grille des voies à péage indisponible (' +
      (e.code === 'ENOENT' ? 'data/toll-grid.json absent, lancer scripts/build-toll-grid.js' : e.message) +
      ') : aucun péage ne sera estimé.');
    STATUS = 'indisponible (' + (e.code || 'erreur de lecture') + ')'; // jamais le message : il peut contenir un chemin (12e audit)
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
//
// seul (facultatif) : code du pays où se trouve le point. Correction du 8e audit (18/09/2026) : sans lui, la tolérance
// allait chercher une autoroute payante ÉTRANGÈRE de l'autre côté d'une frontière. Un trajet Genève → Lausanne,
// entièrement suisse, était facturé 6,6 € « au barème autoroutes françaises » ; mesuré sur des paires de villes
// réelles, 100 % des trajets slovènes, 90 % des suisses, 37 % des autrichiens étaient facturés ainsi, jusqu'à 26 €.
// Avec seul, seules comptent les cases dont la voie à péage appartient à ce pays-là.
function cellCountry(lat, lon, seul, exact){
  const g = load();
  if(!g) return null;
  const i = Math.floor(lat / CELL), j = Math.floor(lon / CELL);
  const ici = g.get(i + ',' + j);
  // exact === 'ambigu' : case payante ET gratuite (pont de la borne basse, voir tolledParts).
  if(exact === 'ambigu') return (ici && (!seul || ici === seul) && FREE.has(i + ',' + j)) ? ici : null;
  if(exact) return (ici && (!seul || ici === seul) && !FREE.has(i + ',' + j)) ? ici : null;
  if(ici && (!seul || ici === seul)) return ici;
  for(let di = -1; di <= 1; di++){
    for(let dj = -1; dj <= 1; dj++){
      const cc = g.get((i + di) + ',' + (j + dj));
      if(cc && (!seul || cc === seul)) return cc;
    }
  }
  return null;
}

// Répartition des kilomètres d'une étape entre les pays dont une voie à péage est présente sur le trajet.
// Retour : [{ country, km }], vide si aucune portion n'est près d'une voie à péage (ou si la grille manque).
// roadKm est la distance PAR LA ROUTE de l'étape : l'échantillonnage suit le trait à vol d'oiseau, mais les kilomètres
// répartis sont bien ceux de la route (la proportion, elle, est celle du trait).
// pays (facultatif, fourni par le moteur) : { duPoint: (lat, lon) -> pays où se trouve ce point ou null, extremites:
// { code: true } pour les pays du départ et de l'arrivée, interieur: (lat, lon, pays) -> vrai si le point est franchement
// à l'intérieur de ce pays }. Quand il est donné, un point n'est facturé qu'au barème de
// SON pays, et un point dont le pays est inconnu n'est pas facturé du tout — jamais de facturation à tort.
// Pays seulement TRAVERSÉ (ni départ ni arrivée) : facturé s'il est traversé sur au moins TRANSIT_MIN_KM d'affilée ET
// qu'au moins un de ces points est franchement à l'intérieur du pays (9e audit du 18/09/2026). Au 8e audit, seuls les
// pays des extrémités l'étaient : Luxembourg → Genève (430 km d'autoroutes françaises) sortait à 0 €. Mais un trait qui
// LONGE une frontière voit son lieu habité le plus proche passer de l'autre côté, parfois sur plus de 30 km : sur
// Genève → Lausanne, le trait suit le Léman et le lieu le plus proche est sur la rive française — mesuré : 3,2 €
// facturés « au barème français » sur ce trajet entièrement suisse avec la seule condition de longueur.
const SAMPLE_KM = 10;
const MAX_SAMPLES = 200;
const TRANSIT_MIN_KM = 30;
// FOURCHETTE (11e audit du 19/09/2026). La grille ne dit que « une voie à péage passe dans cette case ou sa voisine » et
// le moteur suit un trait à vol d'oiseau : il ne peut pas savoir si le vrai itinéraire emprunte l'autoroute payante ou
// l'autoroute gratuite qui la longe (A47 et A7 entre Lyon et Saint-Étienne, A-2 et R-2 à Madrid). Chaque réglage d'un
// montant unique échangeait des fausses factures contre des oublis (8e, 9e et 10e audits). Deux estimations, affichées
// comme une fourchette :
//   - borne HAUTE (opts.upper) : case exacte ou voisine (~28 km autour du trait), transit par un pays tiers compris —
//     tout ce qui pourrait être payant près du trajet ;
//   - borne BASSE : case exacte seulement, et au moins MIN_RUN_CELLS cases payantes d'affilée — les seules sections que le
//     trajet suit presque sûrement (un grand corridor autoroutier payant).
// Mesures et limites : README, « Onzième passe d'audit ».
const MIN_RUN_CELLS_LOW = 2;
function tolledParts(fromLat, fromLon, toLat, toLon, roadKm, pays, opts){
  opts = opts || {};
  const upper = !!opts.upper;
  if(!load() || !(roadKm > 0)) return [];
  const n = Math.max(4, Math.min(MAX_SAMPLES, Math.round(roadKm / SAMPLE_KM)));
  const byCountry = new Map();
  let hits = 0;
  // Interpolation linéaire des coordonnées : elle serait fausse pour une étape franchissant l'antiméridien (180°),
  // mais aucun des pays à barème kilométrique ne s'en approche. Le pire cas resterait d'échantillonner des cases sans
  // voie à péage, donc de ne rien facturer — jamais de facturer à tort.
  const pts = [];
  for(let i = 0; i < n; i++){
    const f = (i + 0.5) / n; // milieu de chaque tronçon : pas de poids double aux extrémités
    pts.push({ lat: fromLat + (toLat - fromLat) * f, lon: fromLon + (toLon - fromLon) * f, pays: pays ? pays.duPoint(fromLat + (toLat - fromLat) * f, fromLon + (toLon - fromLon) * f) : undefined });
  }
  if(pays){
    // Longueur de chaque traversée : suite de points consécutifs dans le même pays.
    const minPoints = Math.ceil(TRANSIT_MIN_KM / (roadKm / n));
    // Trajet INTÉRIEUR (départ et arrivée dans le même pays) : aucun transit facturé (10e audit du 18/09/2026). La route
    // réelle reste dans le pays là où le trait à vol d'oiseau coupe un voisin : Osijek → Split contourne la Bosnie par
    // les autoroutes croates (55 trajets croates sur 300 recevaient une part « barème bosnien »), Saarbrücken → Freiburg
    // suit l'A5 allemande et non l'Alsace (12,3 € « barème français » sur un trajet entièrement allemand).
    // Transit par un pays tiers : borne haute seulement (Lugano → Nice passe réellement par l'Italie, Saarbrücken → Bâle
    // réellement pas par l'Alsace : le trait ne permet pas de les distinguer).
    const interieur = Object.keys(pays.extremites).length <= 1 || !upper;
    for(let i = 0; i < n; ){
      let j = i;
      while(j < n && pts[j].pays === pts[i].pays) j++;
      const c = pts[i].pays;
      if(c && !pays.extremites[c]){
        let traversee = !interieur && j - i >= minPoints;
        if(traversee){
          traversee = false;
          for(let k = i; k < j && !traversee; k++) traversee = pays.interieur(pts[k].lat, pts[k].lon, c);
        }
        if(!traversee){ for(let k = i; k < j; k++) pts[k].pays = null; }
      }
      i = j;
    }
  }
  const tolled = new Array(n);
  for(let i = 0; i < n; i++){
    const lat = pts[i].lat, lon = pts[i].lon, seul = pts[i].pays;
    tolled[i] = (pays && !seul) ? null : cellCountry(lat, lon, seul, !upper);
  }
  // Borne basse : une case AMBIGUË (payante + gratuite) encadrée des deux côtés, le long du trait, par des cases payantes
  // sûres du même pays est comptée (11e audit du 19/09/2026). Un simple croisement d'autoroute gratuite (A23 et A13 sur
  // l'A1 portugaise, déviations de la nationale 1 le long de la Tōmei, autoroutes d'Istanbul) ne fait pas quitter l'axe
  // payant ; sans ce pont, Lisbonne → Porto, Tokyo → Nagoya ou Istanbul → Edirne tombaient à « 0 € probable ». Une
  // ambiguïté en bout de trajet (départ de Madrid, de Barcelone) n'est encadrée que d'un côté : elle reste exclue.
  if(!upper){
    for(let i = 0; i < n; ){
      if(tolled[i]){ i++; continue; }
      let j = i;
      while(j < n && !tolled[j] && (!pays || pts[j].pays) && cellCountry(pts[j].lat, pts[j].lon, pts[j].pays, 'ambigu')) j++;
      if(j > i && i > 0 && j < n && tolled[i - 1] && tolled[i - 1] === tolled[j]){
        for(let k = i; k < j; k++) tolled[k] = tolled[i - 1];
      }
      i = Math.max(j, i + 1);
    }
  }
  // Longueur minimale facturée d'affilée : une case de la grille (10e audit du 18/09/2026). La grille ne sait qu'« une voie à
  // péage passe dans cette case ou sa voisine » (~28 km de côté) : quelques points près d'une autoroute payante ne
  // prouvent pas qu'on l'emprunte. Limoges → Brive (A20 gratuite, l'A89 payante voisine) recevait 8,4 €, un départ de
  // Madrid ou de Barcelone attrapait les radiales payantes. Une portion facturée doit couvrir au moins une case entière.
  // Ce seuil, conséquence de la maille, remplace l'ancien « pas de péage sous 60 km de trajet » (TOLL_MIN_DISTANCE_KM),
  // qui n'avait pas de source et supprimait aussi de vrais péages courts.
  // Borne basse : MIN_RUN_CELLS_LOW cases d'affilée ; borne haute : aucune longueur minimale (tout ce qui est possible).
  const minRun = upper ? 1 : Math.ceil(MIN_RUN_CELLS_LOW * CELL * 111 / (roadKm / n));
  for(let i = 0; i < n; ){
    if(!tolled[i]){ i++; continue; }
    let j = i;
    while(j < n && tolled[j]) j++;
    if(j - i >= minRun){
      for(let k = i; k < j; k++){ hits++; byCountry.set(tolled[k], (byCountry.get(tolled[k]) || 0) + 1); }
    }
    i = j;
  }
  if(!hits) return [];
  const out = [];
  byCountry.forEach(function(count, cc){ out.push({ country: cc, km: roadKm * count / n }); });
  return out;
}

// État pour GET /api/status.
function status(){ load(); return STATUS; }

module.exports = { tolledParts, cellCountry, status, available: () => !!load() };
