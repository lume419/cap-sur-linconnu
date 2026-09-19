// Noms alternatifs multilingues de TOUS les pays, dans TOUTES les langues d'interface (septembre 2026).
//
// POURQUOI — chaque lot de pays avait son propre script d'alias (build-aliases.js, build-asie-aliases.js…), avec la
// liste des langues gérées AU MOMENT de l'ajout du lot ; les langues ajoutées ensuite n'étaient jamais reportées sur les
// pays déjà présents. Résultat : Berlin n'avait que 3 noms alternatifs (italien, néerlandais, portugais), « Берлин » ou
// « ベルリン » ne trouvaient rien ; la France, l'Arménie et la Syrie n'avaient aucun fichier.
//
// PRINCIPE — ADDITIF : chaque fichier aliases-xx.txt existant est gardé tel quel (ses filtres propres restent acquis) ;
// on y ajoute les noms alternatifs GeoNames (alternateNamesV2, scripts/altnames/XX.txt) de ses lieux publiés, dans toute
// langue d'interface (public/js/i18n.js, SUPPORTED) ou déjà acceptée par un script d'alias existant (variantes de
// recherche : zh-TW, yue, nb, quz…). Mêmes règles que ces scripts : noms historiques (et, pour les ajouts, familiers)
// exclus, nom identique au nom publié (après normalisation) exclu, doublons (langue, nom, lieu) exclus.
//
// RATTACHEMENT lieu publié -> geonameid (scripts/dump/XX_dump.txt) :
//   1. mêmes coordonnées à 4 décimales (lieux repris de GeoNames) : l'entrée de même nom, sinon l'unique entrée de
//      classe P à ce point (noms publiés corrigés, ex. Lisbon -> Lisboa) ;
//   2. sinon (France : communes IGN ; Arménie, Syrie : reconstructions) même nom normalisé, entrée de classe P la plus
//      proche à moins de 10 km.
//
// FILTRES REPRIS : dsb -> hsb (sorabe) ; nrf -> nrf-je / nrf-gg (Jersey, Guernesey) ; pap -> pap-AW (Aruba) / pap-CW
// (Curaçao, Bonaire) ; au Royaume-Uni, en Irlande et à Man, noms celtiques recopiés sous une autre langue écartés, et au
// Royaume-Uni, gallois / gaélique écossais / cornique / irlandais limités à leur aire (voir build-aliases.js).
//
// Usage : node scripts/build-all-aliases.js [--dry] [--min-pop=N] [CC ...]
//   --dry        mesure seulement (alias ajoutés par langue, taille), n'écrit rien
//   --min-pop=N  langues AJOUTÉES seulement pour les lieux d'au moins N habitants (0 par défaut)
const fs = require('fs');
const path = require('path');
const { COUNTRIES } = require('../public/js/trip-data.js');
const { normalizeCityName } = require('../lib/trip-engine.js').internals;
const { excludePlace, preparePlaceName, cleanPlaceName, NAME_FIXES } = require('./communes-corrections.js');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'public', 'data');
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const MIN_POP = Number((args.find(a => a.startsWith('--min-pop=')) || '=0').split('=')[1]) || 0;
const ONLY = args.filter(a => /^[A-Z]{2}$/.test(a));

// Langues : interface + toutes celles déjà acceptées par un script d'alias.
function langList(){
  const set = new Set();
  const i18n = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n.js'), 'utf8');
  const sup = i18n.match(/var SUPPORTED = (\[[^\]]*\]);/);
  JSON.parse(sup[1].replace(/'/g, '"')).forEach(l => set.add(l));
  fs.readdirSync(__dirname).filter(f => /^build-.*aliases\.js$/.test(f) && f !== path.basename(__filename)).forEach(f => {
    const m = fs.readFileSync(path.join(__dirname, f), 'utf8').match(/SUPPORTED_LANGS = new Set\(\[([\s\S]*?)\]\)/);
    if(m) (m[1].match(/'[^']+'/g) || []).forEach(q => set.add(q.slice(1, -1)));
  });
  return set;
}
const LANGS = langList();
const LANG_REMAP = { dsb: 'hsb' };
const LANG_REMAP_BY_COUNTRY = { JE: { nrf: 'nrf-je' }, GG: { nrf: 'nrf-gg' }, AW: { pap: 'pap-AW' }, CW: { pap: 'pap-CW' }, BQ: { pap: 'pap-CW' } };
const CELTIC_PROBE_LANGS = new Set(['cy', 'gd', 'kw', 'gv', 'ga']);
const CELTIC_CHECK = new Set(['GB', 'IE', 'IM']);
// Aires linguistiques au Royaume-Uni : reprises de build-aliases.js (GB_REGION_RESTRICTED_LANGS), par la région publiée.
const GB_REGION_RESTRICTED_LANGS = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'build-aliases.js'), 'utf8');
  const block = src.match(/const GB_REGION_RESTRICTED_LANGS = \{([\s\S]*?)\n\};/)[1];
  const out = {};
  block.split(/\n\s*(?=[a-z]{2}: new Set)/).forEach(part => {
    const m = part.match(/([a-z]{2}): new Set\(\[([\s\S]*?)\]\)/);
    if(m) out[m[1]] = new Set((m[2].match(/'[^']+'/g) || []).map(q => q.slice(1, -1)));
  });
  return out;
})();

// NETTOYAGE DES NOMS ALTERNATIFS (septembre 2026, audit n° 10) — appliqué aux lignes EXISTANTES (y compris celles
// écrites par les scripts d'alias par lot, que ce script relit toujours en dernier) comme aux lignes ajoutées.
// GeoNames recopie parfois, depuis Wikipédia/Wikidata, des marques de direction INVISIBLES collées au nom (LRM U+200E,
// RLM U+200F, enchâssements U+202A–U+202E, isolats U+2066–U+2069, ALM U+061C, BOM U+FEFF) — « غجر‎ », « Riha‎ »,
// « ‎Welcome » —, plus rarement des caractères de contrôle C0/C1, et une ponctuation de liste restée collée au nom :
// virgule finale (« ورګون, », « Tobar an Iarla, »), virgule arabe (« ماین، »), deux-points initial (« : ناعورة »),
// point final après une écriture arabe/hébraïque (« مجدل شمس. »), guillemet fermant orphelin (« Çatalhüyük”. »). Ces
// caractères rendent l'alias introuvable par une saisie normale et s'affichent de travers. Ils sont retirés ; l'alias
// est écarté s'il devient vide, identique au nom publié ou doublon d'une autre ligne. CONSERVÉS volontairement :
// ZWNJ/ZWJ (U+200C/U+200D, orthographe persane, ourdoue, indienne…), l'espace sans chasse U+200B (séparateur de mots
// en birman, thaï, lao) et le point d'abréviation (« บ้าน สปก. », « Sopochina Ye. »).
const ALIAS_CONTROL_RE = /[\u0000-\u001F\u007F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
// Caractère de contrôle C1 (U+0080–U+009F) = texte mal décodé (« Alto Igarap<U+0090> Açu », « <U+009F>AA¬²± » pour
// Ottawa) : la lettre d'origine est perdue, l'alias est écarté plutôt que « réparé » (chaîne vide -> ligne retirée).
const ALIAS_MOJIBAKE_RE = /[\u0080-\u009F]/;
// ALIAS PARASITES (suite de l'audit n° 10) — même logique, alias écartés (chaîne vide) :
//   - point d'interrogation (ASCII ou pleine chasse) : caractère perdu à l'encodage (« ?江 » pour Qijiang, « 天?观 ») ou
//     doute du contributeur (« Hiisistö ? », « Plekka? », « 无名? » = « sans nom ? ») — jamais un vrai nom de lieu ;
//   - trait d'union isolé en tête ou en fin : nom tronqué (« Odorovsi- », « ΑΓΙ- ΙΩΑΝΝ- », « -āleḩābād ») ;
//   - commentaire d'éditeur (« no such place », « delete? », « not a PPL », « unknown », « not found ») : aucun cas
//     restant dans les alias, gardé en garde-fou (le lieu TM « There's no such a place here. » et ses alias sont
//     écartés à la source, voir communes-corrections.js).
// Point final isolé (« Stettin. », « Cair Ruairidh. ») : le point est retiré, SAUF abréviation — dernier mot de moins de
// 5 lettres (« orta mah. », « Sopochina Ye. »), autre point ou barre dans l'alias (« Waldkirchen/Erzgeb. »), dernier mot
// début d'un mot du nom publié (« Neustadt Vogtl. » pour Neustadt Vogtland), écriture autre que latine/cyrillique/grecque
// (« บ้าน สปก. », abréviation thaïe).
// GARDÉS : « 无名坑 », « 無名 » (Nameless, Tennessee ; No Name, Colorado), « Безымянное » — vrais noms de lieux.
const ALIAS_JUNK_RE = /[?\uFF1F]|^[-\u2010-\u2014]|[-\u2010-\u2014]$|\b(no such|delete\?|not a PPL|unknown|not found)\b/i;
// AUDIT N° 11 — deux nettoyages de plus :
//   - espace sans chasse U+200B EN TÊTE OU EN FIN d'alias (« <U+200B>ဇောင်းလျားကုန်း » en birman, « ताशक़ुरग़ान<U+200B> » en hindi) :
//     jamais utile à cette place, il rend l'alias introuvable -> retiré. Les U+200B INTERNES (séparateurs de mots en
//     birman, thaï, lao, khmer, tibétain : « ບ້ານ<U+200B>ກວານ ») restent ;
//   - lettre d'un autre alphabet glissée dans un mot (« Грeнобль » : e latin dans un nom russe ; « Zоrоkіv » : о et і
//     cyrilliques dans un nom latin ; « Мендосæ » : æ latin pour le ӕ ossète) : corrigée par fixMixedScript
//     (scripts/communes-corrections.js) quand chaque lettre intruse a un sosie exact dans l'écriture majoritaire du mot
//     (sosies propres à la langue de l'alias compris : һ, palotchka) ; sinon (« Шеллenbergг », « Калан-Деh » en russe)
//     la graphie voulue est incertaine -> alias écarté.
const { fixMixedScript } = require('./communes-corrections.js');
function cleanAliasText(text, canonical, lang){
  text = String(text || '');
  if(ALIAS_MOJIBAKE_RE.test(text)) return '';
  let t = text.replace(ALIAS_CONTROL_RE, '')
    .replace(/^[\s\u200B:,\u060C\u061B]+/, '')
    .replace(/[\s\u200B,\u060C\u061B]+$/, '')
    .replace(/([\u0590-\u08FF])\.$/, '$1')
    .replace(/^([^\u201C\u201D\u201E"]*)[\u201D"]\.$/, '$1')
    .trim();
  if(ALIAS_JUNK_RE.test(t)) return '';
  const mixed = fixMixedScript(t, lang);
  if(!mixed.ok) return '';
  t = mixed.text;
  const m = t.match(/([\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]+)\.$/u);
  if(m && m[1].length >= 5 && !/[./]/.test(t.slice(0, -1))){
    const w = m[1].toLowerCase();
    const abbrev = String(canonical || '').toLowerCase().split(/[\s\-\/]+/).some(x => x !== w && x.startsWith(w));
    if(!abbrev) t = t.slice(0, -1).trim();
  }
  return t;
}

function eachLine(raw, fn){
  let pos = 0;
  while(pos < raw.length){
    let nl = raw.indexOf('\n', pos);
    if(nl < 0) nl = raw.length;
    if(nl > pos) fn(raw.slice(pos, nl));
    pos = nl + 1;
  }
}
const toRad = Math.PI / 180;
function km(aLat, aLon, bLat, bLon){
  const h = Math.sin((bLat - aLat) * toRad / 2) ** 2 + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin((bLon - aLon) * toRad / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

const totals = { added: 0, bytes: 0, byLang: {} };
for(const cc of Object.keys(COUNTRIES)){
  if(ONLY.length && !ONLY.includes(cc)) continue;
  const communesPath = path.join(DATA, COUNTRIES[cc].file);
  // XX_dump.txt, ou XX.txt pour les premiers pays ajoutés (Géorgie)
  let dumpPath = path.join(__dirname, 'dump', cc + '_dump.txt');
  if(!fs.existsSync(dumpPath)) dumpPath = path.join(__dirname, 'dump', cc + '.txt');
  const altPath = path.join(__dirname, 'altnames', cc + '.txt');
  if(!fs.existsSync(communesPath)) continue;
  if(!fs.existsSync(dumpPath) || !fs.existsSync(altPath)){ console.log(cc + ' : fichiers GeoNames absents, ignoré'); continue; }

  // Lieux publiés
  const published = [];
  eachLine(fs.readFileSync(communesPath, 'utf8'), line => {
    const p = line.split(';');
    const ll = p[1].split(',');
    published.push({ pop: parseInt(p[0], 10) || 0, lon: parseFloat(ll[0]), lat: parseFloat(ll[1]), region: p[3], name: p[4], norm: normalizeCityName(p[4]) });
  });

  // Entrées GeoNames : par point (4 décimales) et, pour la classe P, par nom normalisé.
  const byPoint = new Map(), pByName = new Map(), excludedNames = new Set();
  eachLine(fs.readFileSync(dumpPath, 'utf8'), line => {
    const c = line.split('\t');
    const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
    if(isNaN(lat) || isNaN(lon)) return;
    const e = { id: c[0], norm: normalizeCityName(c[1]), ascii: normalizeCityName(c[2]), cls: c[6], lat, lon };
    const k = lat.toFixed(4) + ',' + lon.toFixed(4);
    const l = byPoint.get(k); if(l) l.push(e); else byPoint.set(k, [e]);
    // Nom tel que le générateur le teste (preparePlaceName, audit n° 11) ; le nom brut ET le nom préparé sont retenus.
    if(c[6] === 'P'){ const pn = preparePlaceName(cc, c[0], c[1]); if(excludePlace(cc, c[0], pn, lat, lon)){ excludedNames.add(c[1]); excludedNames.add(pn); } }
    if(c[6] === 'P'){
      [e.norm, e.ascii].forEach((n, i) => { if(i && n === e.norm) return; const m = pByName.get(n); if(m) m.push(e); else pByName.set(n, [e]); });
    }
  });

  // geonameid -> lieu publié (nom canonique, population, région)
  const placeById = new Map();
  let byCoords = 0, byName = 0;
  for(const p of published){
    const here = byPoint.get(p.lat.toFixed(4) + ',' + p.lon.toFixed(4));
    let e = null;
    if(here){
      e = here.find(x => x.norm === p.norm || x.ascii === p.norm);
      if(!e){ const ps = here.filter(x => x.cls === 'P'); if(ps.length === 1) e = ps[0]; }
      if(e) byCoords++;
    }
    if(!e){
      let best = null, bestKm = 10;
      for(const x of pByName.get(p.norm) || []){ const d = km(p.lat, p.lon, x.lat, x.lon); if(d < bestKm){ bestKm = d; best = x; } }
      if(best){ e = best; byName++; }
    }
    if(e && !placeById.has(e.id)) placeById.set(e.id, p);
  }

  // Fichier existant : gardé, et sert au dédoublonnage.
  const outPath = path.join(DATA, 'aliases-' + cc.toLowerCase() + '.txt');
  let existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8').split('\n').filter(Boolean) : [];
  // Lignes orphelines héritées des premiers scripts : nom canonique absent des lieux publiés (« Copenhagen » quand le
  // lieu s'appelle København, « Gothenburg » pour Göteborg, « Sibbo » pour Sipoo…), ou ligne mal formée (point-virgule
  // dans le nom). Rattachées au nom publié quand une ligne du même groupe le donne comme nom alternatif
  // (da;København;Copenhagen -> København), écartées sinon.
  const publishedNames = new Set(published.map(p => p.name));
  const normByName = new Map(published.map(p => [p.name, p.norm]));
  // Noms publiés nettoyés par les générateurs depuis l'audit n° 11 (cleanPlaceName : « Puerta  de Córdoba » -> « Puerta de
  // Córdoba », « Коltsovo » -> « Koltsovo », « Salgaun] » -> « Salgaun ») : les lignes existantes qui portent encore
  // l'ancien nom sont rattachées au nouveau (même lieu), au lieu de devenir orphelines.
  // 12e audit du 19/09/2026 : ces lignes rattachées n'étaient JAMAIS écrites quand rien d'autre ne changeait dans le
  // pays (condition d'écriture plus bas) — « Sha'biyyat Sikhе̄bar » (е cyrillique, 2 alias arabes) restait dans
  // aliases-ae.txt alors que communes-ae.txt publie « Sikhēbar » : alias orphelins, introuvables. Compteur ajouté
  // (renamedClean). Même rattachement pour les noms corrigés par NAME_FIXES (communes-corrections.js : « Damatou大码头 »
  // -> « Damatou », « Zorkovac_ » -> « Zorkovac ») : ancien nom de la fiche -> nouveau nom, s'il est publié.
  const fixedNameOf = new Map();
  Object.values(NAME_FIXES).forEach(e => { if(e[0] === cc) fixedNameOf.set(e[1], e[2]); });
  let renamedClean = 0, droppedRenamed = 0;
  existing = existing.map(l => {
    const p = l.split(';');
    if(p.length !== 3 || publishedNames.has(p[2])) return l;
    const c = fixedNameOf.has(p[2]) ? cleanPlaceName(fixedNameOf.get(p[2])) : cleanPlaceName(p[2]);
    if(c !== p[2] && publishedNames.has(c)){
      // 13e audit du 19/09/2026 : l'alias qui devient identique au nouveau nom (« en;Tibbi Nizāmuddīn », PK, nom corrigé
      // d'après ce même alias) ou qui porte le même défaut que l'ancien nom (« _ » : « حدود الربعة _ الربعة », YE) est
      // écarté au lieu d'être rattaché (mêmes règles que pour les noms de lieux).
      if(normalizeCityName(p[1]) === normalizeCityName(c) || p[1].includes('_')){ droppedRenamed++; return null; }
      renamedClean++; return p[0] + ';' + p[1] + ';' + c;
    }
    return l;
  }).filter(l => l !== null);
  // Nettoyage des lignes existantes (voir cleanAliasText). Une ligne nettoyée qui retombe sur une ligne déjà présente
  // (même langue, même nom normalisé, même lieu : « غجر‎ » à côté de « غجر ») est retirée ; les autres lignes ne sont
  // jamais touchées, ni réordonnées.
  const keyOf = (lang, text, name) => lang + '|' + normalizeCityName(text) + '|' + name;
  const untouchedKeys = new Set();
  existing.forEach(l => { const p = l.split(';'); if(p.length === 3 && cleanAliasText(p[1], p[2], p[0]) === p[1]) untouchedKeys.add(keyOf(p[0], p[1], p[2])); });
  const cleanedKeys = new Set();
  let cleanedAliases = 0, droppedDirty = 0, dedupDirty = 0;
  existing = existing.map(l => {
    const p = l.split(';');
    if(p.length !== 3) return l;
    const t = cleanAliasText(p[1], p[2], p[0]);
    if(t === p[1]) return l;
    const n = normalizeCityName(t);
    if(!n || n === (normByName.get(p[2]) || normalizeCityName(p[2]))){ droppedDirty++; return null; }
    const k = keyOf(p[0], t, p[2]);
    if(untouchedKeys.has(k) || cleanedKeys.has(k)){ dedupDirty++; return null; }
    cleanedKeys.add(k);
    cleanedAliases++;
    return p[0] + ';' + t + ';' + p[2];
  }).filter(Boolean);
  // Lieux écartés VOLONTAIREMENT par les générateurs de communes (scripts/communes-corrections.js : lieu rangé dans le
  // mauvais pays, lieu disparu « (historical) », base antarctique sous AR, Sercq) : leurs lignes sont écartées, JAMAIS
  // rattachées à un autre lieu — sinon « es;Almirante Brown;Brown Station » (base antarctique retirée de
  // communes-ar.txt) serait rattachée à la ville d'Almirante Brown (province de Buenos Aires), homonyme sans rapport.
  const renameOrphan = new Map();
  existing.forEach(l => { const p = l.split(';'); if(p.length === 3 && !publishedNames.has(p[2]) && !excludedNames.has(p[2]) && publishedNames.has(p[1])) renameOrphan.set(p[2], p[1]); });
  let fixedOrphans = 0, droppedOrphans = 0;
  existing = existing.map(l => {
    const p = l.split(';');
    if(p.length !== 3 || !p[1]){ droppedOrphans++; return null; }
    if(publishedNames.has(p[2])) return l;
    const target = renameOrphan.get(p[2]);
    if(!target){ droppedOrphans++; return null; }
    if(normalizeCityName(p[1]) === normalizeCityName(target)){ droppedOrphans++; return null; }
    fixedOrphans++;
    return p[0] + ';' + p[1] + ';' + target;
  }).filter(Boolean);
  existing = [...new Set(existing)];
  if(renamedClean) console.log(cc + ' : lignes rattachées au nom nettoyé ou corrigé ' + renamedClean);
  if(droppedRenamed) console.log(cc + ' : lignes de l’ancien nom écartées (égales au nouveau nom ou avec « _ ») ' + droppedRenamed);
  if(fixedOrphans || droppedOrphans) console.log(cc + ' : lignes orphelines rattachées ' + fixedOrphans + ', écartées ' + droppedOrphans);
  if(cleanedAliases || droppedDirty || dedupDirty) console.log(cc + ' : alias nettoyés ' + cleanedAliases + ', écartés (vides ou égaux au nom) ' + droppedDirty + ', doublons d\'une ligne existante ' + dedupDirty);
  const seen = new Set(existing.map(l => { const p = l.split(';'); return p[0] + '|' + normalizeCityName(p[1]) + '|' + p[2]; }));
  const existingLangs = new Set(existing.map(l => l.split(';')[0]));

  const alt = fs.readFileSync(altPath, 'utf8');
  let celticNames = null;
  if(CELTIC_CHECK.has(cc)){
    celticNames = new Set();
    eachLine(alt, line => { const c = line.split('\t'); if(CELTIC_PROBE_LANGS.has(c[2]) && c[3]) celticNames.add(normalizeCityName(c[3])); });
  }
  const remap = LANG_REMAP_BY_COUNTRY[cc] || {};
  const added = [];
  eachLine(alt, line => {
    const c = line.split('\t');
    const p = placeById.get(c[1]);
    if(!p) return;
    const rawLang = c[2], text = cleanAliasText(c[3], p.name, c[2]);
    // Noms historiques (isHistoric) et familiers (isColloquial : « Ville-Lumière » pour Paris) exclus.
    if(!text || c[7] === '1' || c[6] === '1') return;
    const lang = remap[rawLang] || LANG_REMAP[rawLang] || rawLang;
    if(!LANGS.has(lang)) return;
    // Langue nouvelle pour ce pays : seuil de population éventuel (--min-pop).
    if(MIN_POP && !existingLangs.has(lang) && p.pop < MIN_POP) return;
    const norm = normalizeCityName(text);
    if(!norm || norm === p.norm) return;
    if(celticNames && !CELTIC_PROBE_LANGS.has(rawLang) && celticNames.has(norm)) return;
    if(cc === 'GB' && GB_REGION_RESTRICTED_LANGS[rawLang] && !GB_REGION_RESTRICTED_LANGS[rawLang].has(p.region || '')) return;
    if(/[;\n\r]/.test(text)) return;
    // 13e audit du 19/09/2026 : « _ » = caractère de saisie (voir UNDERSCORE_RE dans communes-corrections.js) ; les
    // AJOUTS qui en contiennent sont écartés (« حدود الربعة _ الربعة », YE). Les lignes existantes ne sont pas touchées
    // (~100 lignes avec « _ » dans l'ensemble des aliases-xx.txt, à revoir une à une).
    if(text.includes('_')) return;
    const k = lang + '|' + norm + '|' + p.name;
    if(seen.has(k)) return;
    seen.add(k);
    added.push(lang + ';' + text + ';' + p.name);
  });

  const bytes = added.reduce((s, l) => s + Buffer.byteLength(l, 'utf8') + 1, 0);
  totals.added += added.length; totals.bytes += bytes;
  added.forEach(l => { const lg = l.slice(0, l.indexOf(';')); totals.byLang[lg] = (totals.byLang[lg] || 0) + 1; });
  console.log(cc + ' : ' + published.length + ' lieux, ' + placeById.size + ' rattachés (' + byCoords + ' par coordonnées, ' + byName +
    ' par nom), ' + existing.length + ' alias existants, +' + added.length + (DRY ? ' (mesure)' : ''));
  if(!DRY && (added.length || renamedClean || droppedRenamed || fixedOrphans || droppedOrphans || cleanedAliases || droppedDirty || dedupDirty)){
    fs.writeFileSync(outPath, existing.concat(added).join('\n') + '\n', 'utf8');
  }
}
console.log('TOTAL +' + totals.added + ' alias, +' + (totals.bytes / 1048576).toFixed(1) + ' Mo');
console.log('par langue : ' + Object.entries(totals.byLang).sort((a, b) => b[1] - a[1]).map(e => e[0] + ' ' + e[1]).join(', '));
