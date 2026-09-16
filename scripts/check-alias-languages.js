// Contrôle : pour CHAQUE langue d'interface, des noms alternatifs de cette langue tapés dans la recherche retrouvent bien
// leur lieu, avec le nom affiché entre parenthèses dans cette langue (septembre 2026).
//
// Pour chaque langue : jusqu'à SAMPLE noms alternatifs tirés au hasard dans tous les fichiers aliases-xx.txt (code de la
// langue ou code équivalent, voir aliasLangRank dans lib/search-index.js), recherchés dans l'index disque avec cette
// langue d'interface. Réussite si le lieu (même pays, même nom) figure dans les résultats ET que la parenthèse affiche
// un nom de cette langue (ou le nom est déjà contenu dans le nom affiché). Langues sans aucun nom alternatif listées à part.
//
// Usage : node scripts/check-alias-languages.js [taille d'échantillon, 40 par défaut]
const fs = require('fs');
const path = require('path');
const searchIndex = require('../lib/search-index.js');
const engine = require('../lib/trip-engine.js');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'public', 'data');
const SAMPLE = Number(process.argv[2]) || 40;
const normalize = engine.internals.normalizeCityName;
const idx = searchIndex.open(path.join(ROOT, 'cache', 'search-index'), DATA, engine.internals);
if(!idx){ console.error('index de recherche absent ou périmé : lancer npm run build-bundles'); process.exit(1); }

const i18n = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n.js'), 'utf8');
const SUPPORTED = JSON.parse(i18n.match(/var SUPPORTED = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));

// Tous les noms alternatifs : langue -> [{ cc, text, canonical }] ; et (pays|lieu|nom normalisé) -> langues.
const byLang = new Map(), langsOf = new Map();
for(const f of fs.readdirSync(DATA).filter(f => /^aliases-[a-z]{2}\.txt$/.test(f))){
  const cc = f.slice(8, 10).toUpperCase();
  for(const line of fs.readFileSync(path.join(DATA, f), 'utf8').split('\n')){
    if(!line) continue;
    const [lang, text, canonical] = line.split(';');
    if(!text || !canonical) continue;
    (byLang.get(lang) || byLang.set(lang, []).get(lang)).push({ cc, text, canonical });
    const k = cc + '|' + canonical + '|' + normalize(text);
    (langsOf.get(k) || langsOf.set(k, new Set()).get(k)).add(lang);
  }
}

// Tirage pseudo-aléatoire reproductible
let seed = 42;
function rnd(){ seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

const rows = [], empty = [];
for(const lang of SUPPORTED){
  const pool = [];
  for(const [l, list] of byLang) if(searchIndex.aliasLangRank(l, lang) > 0) for(const a of list) pool.push(a);
  if(!pool.length){ empty.push(lang); continue; }
  const picks = [];
  const n = Math.min(SAMPLE, pool.length);
  const used = new Set();
  while(picks.length < n){ const i = Math.floor(rnd() * pool.length); if(!used.has(i)){ used.add(i); picks.push(pool[i]); } }
  let found = 0, shownInLang = 0;
  const fails = [], wrongLang = [];
  for(const a of picks){
    const q = normalize(a.text);
    if(q.length < 3 && !engine.internals.IDEOGRAPHIC_RE.test(q)){ found++; shownInLang++; continue; } // saisie trop courte : non testable
    // Pays du lieu en priorité, comme pour un visiteur de ce pays : isole la question de la langue de celle du classement
    // (un nom très courant, « Buenavista », « San Jose », a des centaines de lieux devant le sien).
    const res = idx.search(a.text, 20, a.cc, lang);
    const hit = res.find(r => r.country === a.cc && r.name === a.canonical);
    if(!hit){ fails.push(a.text + ' → ' + a.canonical + ' (' + a.cc + ') introuvable'); continue; }
    found++;
    if(!hit.matchedName){
      if(normalize(a.canonical).indexOf(q) !== -1 || res.indexOf(hit) >= 0 && normalize(hit.name).startsWith(q)){ shownInLang++; continue; }
      wrongLang.push(a.text + ' → ' + a.canonical + ' : aucune parenthèse'); continue;
    }
    // La parenthèse est-elle dans la langue ? (un nom de même forme normalisée tagué dans cette langue pour ce lieu)
    const langs = langsOf.get(a.cc + '|' + a.canonical + '|' + normalize(hit.matchedName)) || new Set();
    if([...langs].some(l => searchIndex.aliasLangRank(l, lang) > 0)) shownInLang++;
    else wrongLang.push(a.text + ' → ' + a.canonical + ' : parenthèse « ' + hit.matchedName + ' » (' + [...langs].join('/') + ')');
  }
  rows.push({ lang, pool: pool.length, n, found, shownInLang, fails, wrongLang });
}

// Tri : d'abord les langues où la parenthèse n'est pas dans la bonne langue, puis celles où des lieux sont introuvables.
rows.sort((a, b) => (b.wrongLang.length - a.wrongLang.length) || (b.fails.length - a.fails.length));
let totalN = 0, totalFound = 0, totalShown = 0;
for(const r of rows){
  totalN += r.n; totalFound += r.found; totalShown += r.shownInLang;
  console.log(r.lang.padEnd(8) + String(r.pool).padStart(8) + ' noms  ' + r.found + '/' + r.n + ' trouvés, parenthèse dans la langue ' +
    r.shownInLang + '/' + r.found + (r.wrongLang.length ? '\n    LANGUE : ' + r.wrongLang.slice(0, 4).join('\n    LANGUE : ') : '') +
    (r.fails.length ? '\n    ' + r.fails.slice(0, 2).join('\n    ') : ''));
}
console.log('\nTOTAL ' + SUPPORTED.length + ' langues : ' + totalFound + '/' + totalN + ' lieux trouvés, parenthèse dans la langue ' + totalShown + '/' + totalFound);
console.log('\nLangues sans aucun nom alternatif (' + empty.length + ') : ' + empty.join(' '));
