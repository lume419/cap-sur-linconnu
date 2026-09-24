// CRIBLE DES CODES POSTAUX, CALIBRÉ PAR PAYS.
//
// Le crible précédent supposait DEUX caractères partout. Faux dans les deux sens, vérifié : Poltava porte 36000,
// son vrai code, et ses voisins en 38xxx sont dans la même oblast ; Grozny porte 385798 quand toute sa région est
// en 36xxxx. Deux caractères, c'est exact en Espagne, trop fin en Ukraine, trop grossier en Russie.
//
// CALIBRAGE, sans aucune table de référence. Pour chaque longueur L, on demande à chaque lieu si le préfixe
// MAJORITAIRE de ses voisins proches est le sien : la part de oui est la COHÉRENCE de L. Un premier essai
// retenait « le plus grand L au-dessus de 0,97 » : il ÉCARTAIT l'Espagne, où l'on sait pourtant que deux chiffres
// valent une province (L2 = 0,960). Le niveau ne veut rien dire en soi — les lieux de frontière ont légitimement
// une majorité de voisins d'à côté. Ce qui parle, c'est l'endroit où la cohérence S'EFFONDRE : au-delà de la
// bonne longueur, le préfixe découpe plus fin que la géographie et la mesure décroche.
//   Espagne : 0,968 / 0,960 / 0,826 — la marche est entre L2 et L3, donc L = 2.
// On retient donc le L qui précède la PLUS FORTE CHUTE. Un pays dont la cohérence part déjà sous le plancher
// n'est pas calibrable : il est ÉCARTÉ, et c'est écrit plutôt que forcé.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const E = require(ROOT + 'lib/trip-engine.js');
const parse = E.internals.parseCommunesFile;

const RAYON_KM = 12;
const MIN_VOISINS = 5;
const PLANCHER = 0.80;        // sous ce niveau dès L=1, le code ne suit pas la géographie du tout
const MIN_CLASSES = 5;
const ECHANTILLON = 20000;
const LONGUEURS = [1, 2, 3, 4, 5];

const R = 6371, rad = v => v * Math.PI / 180;
function km(a, b){
  const dLa = rad(b.lat - a.lat), dLo = rad(b.lon - a.lon);
  const h = Math.sin(dLa/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
const brut = c => String(c || '').replace(/[\s-]/g, '');
function melangeur(graine){ let s = graine >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const calibrage = {}, suspects = [];
var ARGS = process.argv.slice(2).filter(function(x){ return x.charAt(0) !== '-'; });
if(!ARGS.length){
  ARGS = fs.readdirSync(path.join(ROOT, 'public', 'data'))
    .filter(function(f){ return /^communes-[a-z]{2}.txt$/.test(f); })
    .map(function(f){ return f.slice(9, 11).toUpperCase(); });
  ARGS.push('FR');
}
for(const spec of ARGS){
  const cc = spec.toUpperCase();
  const f = cc === 'FR' ? 'communes.txt' : 'communes-' + cc.toLowerCase() + '.txt';
  let l;
  try { l = parse(fs.readFileSync(path.join(ROOT, 'public', 'data', f), 'utf8'), cc); }
  catch(e){ continue; }
  const pts = l.filter(x => isFinite(x.lat) && isFinite(x.lon) && brut((x.cps || [])[0]).length >= 2);
  if(pts.length < 200){ calibrage[cc] = { L: null, raison: 'trop peu de codes exploitables (' + pts.length + ')' }; continue; }

  // GARDE INDISPENSABLE, trouvée en lisant les suspects zambiens : pour 143 pays sur 239, le champ ne contient
  // PAS un code postal mais l identifiant de RÉGION ISO — « ZM-08 », « BO-05 ». Le générateur l écrit faute de
  // fichier postal pour ce pays (build-country-communes.js). Y faire tourner ce crible revient à tester la
  // région sous couvert de tester le code, et surtout : EFFACER ce champ y détruirait une donnée juste, puisque
  // c est la seule étiquette de région dont ces fiches disposent. Sans cette garde, le crible rendait 935
  // suspects dont l essentiel venait de ces pays-là.
  const iso = new RegExp('^' + cc + '(-|$)');
  const partISO = pts.filter(p => iso.test(String((p.cps || [])[0]))).length / pts.length;
  if(partISO >= 0.5){
    calibrage[cc] = { L: null, raison: 'le champ porte l identifiant de région, pas un code postal ('
      + Math.round(partISO * 100) + ' % des fiches) : ce pays n a pas de fichier postal' };
    console.log(cc.padEnd(4) + String(pts.length).padStart(8) + '   ÉCARTÉ : identifiant de région, pas un code postal');
    continue;
  }

  const g = new Map();
  pts.forEach(p => { const k = Math.floor(p.lat*4) + '|' + Math.floor(p.lon*4);
    if(!g.has(k)) g.set(k, []); g.get(k).push(p); });
  const port = Math.ceil(RAYON_KM/27) + 1;
  const voisinsDe = p => {
    const cLa = Math.floor(p.lat*4), cLo = Math.floor(p.lon*4), out = [];
    for(let a = cLa-port; a <= cLa+port; a++) for(let b = cLo-port; b <= cLo+port; b++){
      const c = g.get(a + '|' + b); if(!c) continue;
      for(const q of c){ if(q === p) continue; if(km(p, q) <= RAYON_KM) out.push(q); }
    }
    return out;
  };

  const rnd = melangeur(1234567);
  const ech = pts.length <= ECHANTILLON ? pts : pts.filter(() => rnd() < ECHANTILLON / pts.length);
  const voisinage = new Map();      // calculé une fois, réutilisé pour les cinq longueurs
  for(const p of ech) voisinage.set(p, voisinsDe(p));

  const coh = {}, classes = {};
  for(const L of LONGUEURS){
    classes[L] = new Set(pts.map(p => brut((p.cps || [])[0]).slice(0, L)).filter(x => x.length === L)).size;
    let ok = 0, vus = 0;
    for(const p of ech){
      const mien = brut((p.cps || [])[0]).slice(0, L);
      if(mien.length !== L) continue;
      const compte = {}; let n = 0;
      for(const q of voisinage.get(p)){
        const k = brut((q.cps || [])[0]).slice(0, L); if(k.length !== L) continue;
        compte[k] = (compte[k] || 0) + 1; n++;
      }
      if(n < MIN_VOISINS) continue;
      vus++;
      let majo = null, best = -1;
      for(const k of Object.keys(compte)) if(compte[k] > best){ best = compte[k]; majo = k; }
      if(majo === mien) ok++;
    }
    coh[L] = vus ? ok / vus : 0;
  }

  // RÈGLE DE CHOIX. Deux essais écartés, et leurs contre-exemples sont gardés parce qu ils expliquent le troisième :
  //   - « le plus grand L au-dessus de 0,97 » écartait l ESPAGNE (L2 = 0,960), où deux chiffres valent pourtant
  //     une province : le NIVEAU de cohérence ne veut rien dire en soi, les lieux de frontière ont légitimement
  //     une majorité de voisins d à côté, et ce plancher dépend de la densité du pays ;
  //   - « le L qui précède la plus forte chute » donnait L = 4 à l Espagne : la courbe décroît sans fin, donc la
  //     plus forte chute tombe toujours à la queue.
  // Ce qui parle est la DÉGRADATION RELATIVE : on garde le préfixe le plus FIN dont la cohérence reste à moins de
  // cinq points de celle du plus GROSSIER, chaque pays étant ainsi jugé à son propre étalon.
  //   Espagne 0,968 -> L2 = 0,960 gardé, L3 = 0,826 rejeté : L = 2, ce qui est la province.
  //   Ukraine 0,912 -> L2 = 0,854 rejeté : L = 1, et Poltava (36000, son VRAI code) cesse d être signalée.
  // La marge de cinq points n est pas libre : à six, l Ukraine repasse à L = 2 et le bruit revient. Le prix est la
  // PRUDENCE — Pologne et Portugal restent à L = 1 là où L = 2 serait défendable. On perd des signalements, on
  // n en invente pas.
  const MARGE = 0.05;
  let choisi = null;
  if(coh[1] >= PLANCHER){
    for(const L of LONGUEURS){
      if(classes[L] < MIN_CLASSES) continue;
      if(coh[L] >= coh[1] - MARGE) choisi = L;
    }
  }
  const pire = choisi === null ? -1 : +(coh[1] - coh[choisi]).toFixed(3);
  const raison = choisi === null
    ? (coh[1] < PLANCHER ? 'cohérence de ' + coh[1].toFixed(3) + ' dès L=1 : le code ne suit pas la géographie'
       : 'moins de ' + MIN_CLASSES + ' classes distinctes')
    : null;
  calibrage[cc] = { L: choisi, raison, coherence: LONGUEURS.map(L => +coh[L].toFixed(3)),
    classes: LONGUEURS.map(L => classes[L]), chute: pire, lieux: pts.length };

  let trouves = 0;
  if(choisi !== null){
    const L = choisi;
    for(const p of pts){
      const mien = brut((p.cps || [])[0]).slice(0, L);
      if(mien.length !== L) continue;
      const compte = {}; let n = 0;
      for(const q of voisinsDe(p)){
        const k = brut((q.cps || [])[0]).slice(0, L); if(k.length !== L) continue;
        compte[k] = (compte[k] || 0) + 1; n++;
      }
      if(n < MIN_VOISINS) continue;
      if(compte[mien]) continue;                      // un voisin au moins partage son préfixe
      const cles = Object.keys(compte);
      if(cles.length !== 1) continue;                 // les voisins doivent s'accorder ENTRE EUX
      trouves++;
      suspects.push({ cc, L, nom: p.name, lat: p.lat, lon: p.lon, pop: Number(p.pop) || 0,
        cp: (p.cps || [])[0], mien, voisin: cles[0], n, div: p.dept });
    }
  }
  console.log(cc.padEnd(4) + String(pts.length).padStart(8) + '   '
    + LONGUEURS.map(L => coh[L].toFixed(3)).join(' ') + '   -> '
    + (choisi === null ? 'ÉCARTÉ (' + raison + ')' : 'L=' + choisi + '   ' + trouves + ' suspect(s)'));
}
// Sortie JSON seulement si on la demande : sans cela le script déposait deux fichiers à la RACINE du dépôt.
const S = process.env.OUT || null;
if(S) fs.writeFileSync(S + '-calibrage.json', JSON.stringify(calibrage, null, 1));
suspects.sort((a, b) => b.pop - a.pop);
if(S) fs.writeFileSync(S + '-suspects.json', JSON.stringify(suspects, null, 1));
const ecartes = Object.keys(calibrage).filter(k => calibrage[k].L === null);
console.log('\nTOTAL : ' + suspects.length + ' suspect(s) sur ' + (Object.keys(calibrage).length - ecartes.length)
  + ' pays calibrés ; ' + ecartes.length + ' pays écartés' + (ecartes.length ? ' (' + ecartes.join(', ') + ')' : ''));
