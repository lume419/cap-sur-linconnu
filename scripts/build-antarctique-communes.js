// Script ponctuel (septembre 2026) : ANTARCTIQUE (AQ), ÎLE BOUVET (BV) et TERRES AUSTRALES ET ANTARCTIQUES
// FRANÇAISES (TF, en entier). Choix explicite de l'utilisateur : ajoutés « quand même » — RECHERCHABLES, SANS
// TRAJET POSSIBLE (pays dans ISLAND_ONLY_COUNTRIES : chaque lieu est une masse terrestre à lui seul, un départ y
// aboutit à « itinéraire impossible »). Aucun habitant permanent, aucune route reliant ces lieux au reste du monde,
// aucun hébergement ouvert au public, aucun ferry pour véhicules.
//
// Aucun fichier postal GeoNames pour AQ, BV et TF (404) : le champ "cp" porte une ÉTIQUETTE, jamais un code postal
// (« TF-0x » = division admin1 GeoNames, « AQ » et « BV » faute de division).
//
// ANTARCTIQUE — GeoNames ne range quasiment aucun lieu en classe P (ville) : les bases sont des « STNB » (station
// scientifique) ou, dans les entrées récentes (identifiants 13 xxx xxx), des PPL/PPLL. Sont retenus :
//   - toutes les entrées PPL, PPLL (lieux habités, dont Villa Las Estrellas, seul village à familles) ;
//   - toutes les STNB, sauf les stations marquées historiques par GeoNames (« (historical) », ou suffixe de pays
//     « /USA/ », « /Brit./ », « /SSSR/ » hérité des répertoires GNIS/SCAR anciens).
// Exclus : PPLQ (Port-Martin, base française détruite en 1952), PPLW (refuge détruit), STNM (stations météo
// automatiques inhabitées — sauf si aucun autre point ne décrit la base, voir STNM_KEEP).
// DOUBLONS : GeoNames décrit souvent une même base deux ou trois fois (entrée SCAR 6620xxx, entrée 8521xxx, entrée
// récente 13xxxxxx). Deux entrées sont fusionnées si elles sont à moins de 3 km ET partagent un mot significatif du
// nom (après retrait de « station », « base », « research »…), ou si elles sont à moins de 100 m (Faraday, ancien nom
// britannique de Vernadsky, au même point) ; on garde alors d'abord la PPL/PPLL, puis la plus
// peuplée. La distance seule ne suffit pas : Progress, Zhongshan, Bharati et Law-Racoviță sont quatre bases distinctes
// à moins de 3 km l'une de l'autre (collines Larsemann). Les autres noms de l'entrée fusionnée deviennent des alias.
// LIMITE : GeoNames ne signale pas toutes les bases fermées (Byrd, Svea, Wasa…) — reprises telles quelles.
//
// ÎLE BOUVET — inhabitée, aucune entrée de classe P : seule l'île elle-même (3371122 Bouvetøya) est reprise.
//
// TAAF — GeoNames range sous TF :
//   Îles Éparses (TF.05) : Glorieuses (Île Glorieuse, Île du Lys) et Juan de Nova (déjà là), plus Europa, Bassas da
//     India et Tromelin — les ÎLES elles-mêmes, population 0 (postes militaires / météo, aucun habitant permanent).
//     Tromelin porte admin1 « 00 » dans GeoNames mais son entrée ADM2 933908 est sous TF.05 : rattachée aux Éparses.
//   Kerguelen (TF.03) : Port-aux-Français (PPLC). Crozet (TF.02) : Alfred Faure (PPL 13513007 ; la STNB 936370
//     « Base Alfred Faure » en est le doublon, gardée en alias). Saint-Paul-et-Amsterdam (TF.01) : Martin-de-Viviès
//     (PPL 11594686 ; STNB 1546290 doublon). Terre-Adélie (TF.04) : Dumont d'Urville Station (STNB 6620749, sans
//     admin1 dans GeoNames, rattachée à TF.04 par sa longitude 140° E, dans le secteur 136°–142° E).
// Les noms des archipels, îles et districts sont ajoutés comme alias de leur base (taper « Kerguelen », « Crozet »,
// « Amsterdam », « Terre Adélie » trouve la base), comme l'était déjà « Glorieuses » pour Grande Glorieuse.

const fs = require('fs');
const path = require('path');
const { isAntarcticUnderAR, HISTORICAL_NAME_RE } = require('./communes-corrections.js');

function readAdmin1Names(){
  const map = new Map();
  fs.readFileSync(path.join(__dirname, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => {
    const f = l.split('\t');
    if(f[0] && f[1]) map.set(f[0], f[1]);
  });
  return map;
}
const admin1Names = readAdmin1Names();
const rows = cc => fs.readFileSync(path.join(__dirname, 'dump', cc + '_dump.txt'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));
const altRows = cc => fs.readFileSync(path.join(__dirname, 'altnames', cc + '.txt'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));
const DATA = path.join(__dirname, '..', 'public', 'data');

// Codes de langue réels seulement (GeoNames mêle « link », « wkdt », « unlc », « icao »… aux langues).
const NOT_LANGS = new Set(['link', 'wkdt', 'unlc', 'post', 'iata', 'icao', 'faac', 'abbr', 'fr_1793', 'tcid']);
function langOf(code){
  if(!code) return 'fr';
  if(NOT_LANGS.has(code) || !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(code)) return null;
  return code;
}
function norm(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function line(c, pop, cp, region, name){
  const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
  return `${pop};${lon.toFixed(4)},${lat.toFixed(4)};${cp};${region || ''};${name}`;
}
function writeAll(cc, lines, aliases){
  fs.writeFileSync(path.join(DATA, 'communes-' + cc.toLowerCase() + '.txt'), lines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(DATA, 'aliases-' + cc.toLowerCase() + '.txt'), aliases.join('\n') + (aliases.length ? '\n' : ''), 'utf8');
  console.log(cc + ' : ' + lines.length + ' lieux, ' + aliases.length + ' alias');
}
// Alias : noms alternatifs (non historiques) des entrées rattachées à chaque lieu publié, plus les noms principaux de
// ces entrées quand ils diffèrent du nom publié.
function buildAliases(cc, targetById, dumpById, extraAltRows){
  const seen = new Set(), out = [];
  const add = (lang, alt, canonical) => {
    if(!alt || norm(alt) === norm(canonical)) return;
    const k = lang + '|' + norm(alt) + '|' + canonical;
    if(seen.has(k)) return;
    seen.add(k);
    out.push(`${lang};${alt};${canonical}`);
  };
  for(const [id, canonical] of targetById){
    const c = dumpById.get(id);
    if(c) add('fr', c[1], canonical);
  }
  altRows(cc).concat(extraAltRows || []).forEach(c => {
    const canonical = targetById.get(c[1]);
    const lang = langOf(c[2]);
    if(!canonical || !lang || c[7] === '1') return;
    add(lang, c[3], canonical);
  });
  return out;
}
const km = (a, b) => {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// ── ANTARCTIQUE ───────────────────────────────────────────────────────────────────────────────────
{
  const dump = rows('AQ');
  // BASES RANGÉES SOUS « AR » (septembre 2026, audit n° 10) : GeoNames range 32 bases de l'Antarctique sous le code
  // AR, division « Tierra del Fuego » (revendication argentine, gelée par le traité sur l'Antarctique) ; elles étaient
  // publiées dans communes-ar.txt, doublant pour la plupart une base déjà décrite ici. build-ameriques-communes.js les
  // écarte désormais (tout lieu AR au sud de 60° S, voir communes-corrections.js) et elles sont reprises ICI : mêmes
  // critères que ce que retenait le lot Amériques (classe P, hors « (historical) »), puis même règle de doublon que
  // pour les entrées AQ entre elles, mais toujours APRÈS toutes les entrées AQ — une base déjà décrite sous AQ garde
  // son nom et ses coordonnées publiés, l'entrée AR ne lui apporte que ses noms en alias ; une base absente d'AQ est
  // ajoutée telle quelle.
  const arDump = rows('AR').filter(c => c[6] === 'P' && c[1] && !HISTORICAL_NAME_RE.test(c[1]) && isAntarcticUnderAR('AR', parseFloat(c[4])));
  const arIds = new Set(arDump.map(c => c[0]));
  const dumpById = new Map(dump.concat(arDump).map(c => [c[0], c]));
  const HISTORIC = /\(historical\)|\/[A-Za-z. ]+\/\s*$/;
  // Stations météo gardées : seul point GeoNames d'une base habitée (Great Wall 6620755 est doublée par 8521030 STNB,
  // Jubany = Carlini, base argentine habitée, population 60 dans GeoNames).
  const STNM_KEEP = new Set(['6620760']);
  const STOP = new Set(['station', 'stasjon', 'base', 'research', 'antarctic', 'scientific', 'camp', 'estacion', 'estación',
    'polar', 'the', 'de', 'del', 'la', 'di', 'von', 'and', 'et', 'spanish', 'polish', 'czech', 'brazilian', 'argentine', 'chilean']);
  const words = name => new Set(name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ')
    .split(' ').filter(w => w.length >= 4 && !STOP.has(w)).map(w => w.replace(/cch/g, 'ch')));
  const cands = dump.filter(c => {
    if(c[7] === 'PPL' || c[7] === 'PPLL') return true;
    if(c[7] === 'STNB') return !HISTORIC.test(c[1]);
    if(c[7] === 'STNM') return STNM_KEEP.has(c[0]);
    return false;
  }).concat(arDump).map(c => ({ c, id: c[0], name: c[1], lat: parseFloat(c[4]), lon: parseFloat(c[5]), pop: parseInt(c[14], 10) || 0,
    ppl: c[7] !== 'STNB' && c[7] !== 'STNM', ar: arIds.has(c[0]) ? 1 : 0, w: words(c[1]) }));
  cands.sort((a, b) => (a.ar - b.ar) || (b.ppl - a.ppl) || (b.pop - a.pop) || (a.id.localeCompare(b.id)));
  const kept = [];
  // Entrées AR que la règle générale range mal (vérifiées une par une) :
  //   - fusionnées de force : Carlini Base (13353913) est la base argentine « Jubany », renommée Carlini en 2012 (500 m,
  //     aucun mot commun) ; le laboratoire Dallmann (13526693) est un bâtiment de cette même base ; le laboratoire Dirck
  //     Gerritsz (13526695) est le laboratoire néerlandais installé DANS Rothera (280 m) ; la German Antarctic Receiving
  //     Station (13512718) est l'antenne GARS de la base O'Higgins — même longitude au mètre près, latitude saisie
  //     « -62,195 » au lieu de « -63,32 » dans GeoNames (déjà décrite sous AQ : « GARS-O'Higgins », 13353925).
  //   - jamais fusionnée : Julio Ripamonti (13526702), base chilienne de l'île Ardley, distincte de la base Escudero
  //     (île du Roi-George, 2,2 km) — le seul mot commun est le prénom « Julio ».
  const AR_MERGE_INTO = { '13353913': '6620760', '13526693': '6620760', '13526695': '12420904', '13512718': '13512709' };
  const AR_NO_MERGE = new Set(['13526702']);
  for(const p of cands){
    if(AR_MERGE_INTO[p.id]){
      const target = kept.find(k => k.id === AR_MERGE_INTO[p.id]);
      if(!target) throw new Error('base AQ absente pour la fusion de ' + p.name);
      target.merged.push(p.id);
      continue;
    }
    const dup = AR_NO_MERGE.has(p.id) ? null : kept.find(k => km(k, p) < 0.1 || (km(k, p) < 3 && [...p.w].some(w => k.w.has(w))));
    if(dup){ dup.merged.push(p.id); continue; }
    p.merged = [p.id];
    kept.push(p);
  }
  // Deux bases distinctes ne peuvent pas porter le même nom publié : le cas ne se présente pas (vérifié ci-dessous).
  const names = new Set();
  kept.forEach(k => { if(names.has(k.name)) throw new Error('nom en double : ' + k.name); names.add(k.name); });
  kept.sort((a, b) => b.pop - a.pop || a.name.localeCompare(b.name));
  const lines = kept.map(k => line(k.c, k.pop, 'AQ', '', k.name));
  const targetById = new Map();
  kept.forEach(k => k.merged.forEach(id => targetById.set(id, k.name)));
  writeAll('AQ', lines, buildAliases('AQ', targetById, dumpById, altRows('AR').filter(c => arIds.has(c[1]))));
  console.log('  bases lues sous AR : ' + arDump.length + ', ajoutées : ' + kept.filter(k => k.ar).map(k => k.name).join(' | '));
  kept.filter(k => k.merged.length > 1).forEach(k => console.log('  fusion : ' + k.name + ' <- ' + k.merged.slice(1).map(id => dumpById.get(id)[1]).join(' | ')));
}

// ── ÎLE BOUVET ────────────────────────────────────────────────────────────────────────────────────
{
  const dumpById = new Map(rows('BV').map(c => [c[0], c]));
  const c = dumpById.get('3371122');
  if(!c) throw new Error('Bouvetøya absente du dump');
  writeAll('BV', [line(c, 0, 'BV', '', c[1])], buildAliases('BV', new Map([['3371122', c[1]]]), dumpById));
}

// ── TAAF ──────────────────────────────────────────────────────────────────────────────────────────
{
  const dumpById = new Map(rows('TF').map(c => [c[0], c]));
  // [identifiant publié, division admin1, population reprise ?, identifiants dont les noms deviennent des alias]
  const PLACES = [
    ['1024032', '05', false, ['1024033']],          // Île Glorieuse (+ archipel des Glorieuses)
    ['1024034', '05', false, []],                   // Île du Lys
    ['1024028', '05', false, []],                   // Île Juan de Nova
    ['933909', '05', false, ['933910']],            // Île Europa
    ['936201', '05', false, ['936202']],            // Bassas da India
    ['933907', '05', false, ['933908']],            // Île Tromelin
    ['1546102', '03', true, ['1546556', '1546557', '1546558']],       // Port-aux-Français (+ Kerguelen)
    ['13513007', '02', true, ['936370', '936338', '936339', '936225']], // Alfred Faure (+ Crozet, île de la Possession)
    ['11594686', '01', true, ['1546290', '1547220', '1547221']],      // Martin-de-Viviès (+ Amsterdam, district)
    ['6620749', '04', true, ['6690917']]                              // Dumont d'Urville (+ Terre-Adélie)
  ];
  const lines = [], targetById = new Map();
  for(const [id, adm, withPop, extra] of PLACES){
    const c = dumpById.get(id);
    if(!c) throw new Error('entrée GeoNames absente : ' + id);
    extra.forEach(e => { if(!dumpById.has(e)) throw new Error('entrée GeoNames absente : ' + e); });
    lines.push(line(c, withPop ? (parseInt(c[14], 10) || 0) : 0, 'TF-' + adm, admin1Names.get('TF.' + adm), c[1]));
    [id, ...extra].forEach(e => targetById.set(e, c[1]));
  }
  writeAll('TF', lines, buildAliases('TF', targetById, dumpById));
}
