// Script ponctuel (septembre 2026) pour deux territoires insulaires sans rapport entre eux, ajoutés
// dans le même passage que le Cameroun :
//
// SAINTE-HÉLÈNE, ASCENSION ET TRISTAN DA CUNHA (SH) — lieux habités GeoNames (classe P), sans
// dédoublonnage ni exclusion nécessaires (20 lieux). Le champ "cp" porte ici un VRAI code postal : le
// territoire en a un par île, un seul pour toute l'île — STHL 1ZZ (Sainte-Hélène, fiche UPU établie
// par la Royal Mail, 08/2005, repris par le gouvernement de Sainte-Hélène), TDCU 1ZZ (Tristan da
// Cunha, bureau de poste de Tristan et fiche UPU), ASCN 1ZZ (Ascension, sources secondaires seulement
// — signalé). Rattachement par le code admin1 GeoNames de chaque lieu (SH.01 Ascension, SH.02 Saint
// Helena, SH.03 Tristan da Cunha).
//
// ÎLES GLORIEUSES et ÎLE JUAN DE NOVA (TF, îles Éparses) — choix explicite de l'utilisateur :
// recherchables, sans trajet possible. GeoNames n'y recense AUCUN lieu habité (aucune entrée de
// classe P) : il n'y a ni habitant permanent, ni route, ni hébergement — un gendarme et quatorze
// militaires par île, relevés par avion militaire (livret TAAF 2016 ; rapport du Sénat n° 664 du
// 22 juillet 2020), et tout débarquement exige une autorisation du préfet des TAAF. Les seuls points
// repris sont donc les ÎLES elles-mêmes telles que GeoNames les décrit (classe T, entrées 1024032
// Île Glorieuse, 1024034 Île du Lys, 1024028 Île Juan de Nova), population 0, sous la division
// GeoNames TF.05 « Îles Éparses ». Les autres îles Éparses (Europa, Bassas da India, Tromelin) et le
// reste des TAAF ne sont pas demandés et ne sont pas ajoutés.

const fs = require('fs');
const path = require('path');

const SH_POSTCODES = { '01': 'ASCN 1ZZ', '02': 'STHL 1ZZ', '03': 'TDCU 1ZZ' };
const KEEP_FEATURE_CODES = new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLF','PPLG','PPLL','PPLS']);
const TF_ISLAND_IDS = ['1024032', '1024034', '1024028'];

function readAdmin1Names(){
  const map = new Map();
  fs.readFileSync(path.join(__dirname, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => {
    const f = l.split('\t');
    if(f[0] && f[1]) map.set(f[0], f[1]);
  });
  return map;
}
const admin1Names = readAdmin1Names();
function rows(cc){
  return fs.readFileSync(path.join(__dirname, 'dump', cc + '_dump.txt'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));
}
function write(cc, lines){
  const out = path.join(__dirname, '..', 'public', 'data', 'communes-' + cc.toLowerCase() + '.txt');
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  console.log(cc + ' : ' + lines.length + ' lieux -> ' + out);
}

// ── SAINTE-HÉLÈNE, ASCENSION ET TRISTAN DA CUNHA ──────────────────────────────────────────────────
{
  const lines = rows('SH').filter(c => c[6] === 'P' && KEEP_FEATURE_CODES.has(c[7])).map(c => {
    const cp = SH_POSTCODES[c[10]];
    if(!cp) throw new Error('lieu sans île connue : ' + c[1]);
    const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
    return `${parseInt(c[14], 10) || 0};${lon.toFixed(4)},${lat.toFixed(4)};${cp};${admin1Names.get('SH.' + c[10])};${c[1]}`;
  });
  write('SH', lines);
}

// ── ÎLES GLORIEUSES ET JUAN DE NOVA ───────────────────────────────────────────────────────────────
{
  const byId = new Map(rows('TF').map(c => [c[0], c]));
  const lines = TF_ISLAND_IDS.map(id => {
    const c = byId.get(id);
    if(!c) throw new Error('entrée GeoNames absente : ' + id);
    const lat = parseFloat(c[4]), lon = parseFloat(c[5]);
    return `0;${lon.toFixed(4)},${lat.toFixed(4)};TF-05;${admin1Names.get('TF.05')};${c[1]}`;
  });
  write('TF', lines);
}

// ── Alias des îles Éparses ────────────────────────────────────────────────────────────────────────
// Le nom GeoNames commence par « Île » : sans alias, taper « Juan de Nova » ou « Glorieuses » ne
// trouvait rien (la recherche porte sur le début du nom). Alias repris des noms alternatifs GeoNames
// de chaque île, plus ceux de l'ARCHIPEL des Glorieuses (entrée 1024033, « Îles Glorieuses »,
// « Glorioso Islands »…) rattachés à Grande Glorieuse, son île principale — seule entrée qui les
// porte n'étant pas un lieu mais l'archipel lui-même.
{
  const LANGS = new Set(['', 'fr', 'en', 'es', 'pt', 'de', 'it', 'nl', 'mg']);
  const TARGET = { '1024028': 'Île Juan de Nova', '1024032': 'Île Glorieuse', '1024033': 'Île Glorieuse', '1024034': 'Île du Lys' };
  const seen = new Set(), out = [];
  fs.readFileSync(path.join(__dirname, 'altnames', 'TF.txt'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')).forEach(c => {
    const canonical = TARGET[c[1]], lang = c[2], alt = c[3];
    if(!canonical || !LANGS.has(lang) || !alt || c[7] === '1') return;
    if(alt.toLowerCase() === canonical.toLowerCase()) return;
    const k = (lang || 'fr') + '|' + alt.toLowerCase() + '|' + canonical;
    if(seen.has(k)) return;
    seen.add(k);
    out.push(`${lang || 'fr'};${alt};${canonical}`);
  });
  const outPath = path.join(__dirname, '..', 'public', 'data', 'aliases-tf.txt');
  fs.writeFileSync(outPath, out.join('\n') + '\n', 'utf8');
  console.log('TF : ' + out.length + ' alias -> ' + outPath);
}
