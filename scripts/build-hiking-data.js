// Fusionne la recherche sourcée sur les randonnées (scripts/hiking/hiking-*.js, septembre 2026) en data/hiking.json, lu
// par server.js au démarrage : pays où Visorando propose réellement des randonnées, et portails de randonnée de
// référence par pays (lien « Plus de randonnées », modèle d'URL vérifié avec {town}, {lat}, {lon}). Validation stricte.
const fs = require('fs');
const path = require('path');
const { COUNTRIES } = require('../public/js/trip-data.js');

const DIR = path.join(__dirname, 'hiking');
const OUT = path.join(__dirname, '..', 'data', 'hiking.json');
const errors = [];
const check = (cond, msg) => { if(!cond) errors.push(msg); };
const visorando = new Set(), portals = [];
for(const f of fs.readdirSync(DIR).filter(f => /^hiking-.+\.js$/.test(f)).sort()){
  const data = require(path.join(DIR, f));
  (data.visorandoCountries || []).forEach(cc => { check(COUNTRIES[cc], f + ' : Visorando ' + cc + ' inconnu'); visorando.add(cc); });
  (data.portals || []).forEach((p, i) => {
    const at = f + ' portals[' + i + '] ' + (p.country || '?') + ' ' + (p.name || '?');
    check(COUNTRIES[p.country], at + ' : pays');
    check(p.name && String(p.name).length <= 40, at + ' : nom');
    check(/^https:\/\/[^\s<>"']+$/.test(p.url || ''), at + ' : url https');
    check((String(p.url).match(/\{(\w+)\}/g) || []).every(x => ['{town}', '{lat}', '{lon}'].includes(x)), at + ' : espace réservé inconnu');
    check(!p.searchByUrl || /\{(town|lat|lon)\}/.test(p.url), at + ' : recherche sans espace réservé');
    check(p.verified, at + ' : vérification');
    check(portals.filter(q => q.country === p.country).length < 2, at + ' : plus de 2 portails');
    portals.push({ country: p.country, name: p.name, url: p.url });
  });
}
if(!visorando.size) visorando.add('FR');
if(errors.length){ console.error('REFUS :\n  ' + errors.join('\n  ')); process.exit(1); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ visorandoCountries: [...visorando].sort(), portals: portals }, null, 1) + '\n');
console.log('Visorando : ' + [...visorando].sort().join(' ') + ' ; ' + portals.length + ' portails dans ' + new Set(portals.map(p => p.country)).size + ' pays -> ' + OUT);
