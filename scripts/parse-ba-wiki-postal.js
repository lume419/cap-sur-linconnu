// Parseur ponctuel (pas un script réutilisable comme build-country-communes.js) : GeoNames n'a
// AUCUN fichier de codes postaux pour la Bosnie-Herzégovine (téléchargement -> 404, vérifié), un cas
// inédit parmi tous les pays ajoutés jusqu'ici. Choix explicite de l'utilisateur (voir commit) :
// reconstruire les codes postaux réels depuis la liste Wikipedia "Postal codes in Bosnia and
// Herzegovina" (sourcée BH Pošta/HP Mostar/Pošte Srpske, les trois opérateurs postaux du pays),
// rapprochée ensuite par NOM (pas par coordonnées, contrairement au pipeline habituel) des communes
// du dump géographique GeoNames dans build-ba-communes.js.
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(process.env.BA_WIKITEXT_PATH || path.join(__dirname, 'ba_postal_wikitext.txt'), 'utf8');

const lines = raw.split('\n');
const entries = [];
for(const line of lines){
  const m = /^\*\s*(\d{5})\s*[–-]\s*(.+)$/.exec(line.trim());
  if(!m) continue;
  const cp = m[1];
  let rest = m[2];
  // Coupe l'opérateur postal (après la dernière virgule de haut niveau) et toute note entre balises
  // <small>...</small> (ex. "Temporarily closed").
  rest = rest.replace(/<small>.*?<\/small>/gi, '');
  // Formes de lien wiki à gérer, dans cet ordre :
  //  [[Nom réel|Texte affiché]]  -> Texte affiché (le nom réellement utilisé sur place)
  //  [[Nom]]                     -> Nom
  //  {{ill|Nom (Municipalité)|bs}} -> Nom (Municipalité) (interwiki "article manquant", même info utile)
  //  Nom simple sans balisage    -> Nom tel quel
  let name = null;
  let mm;
  if((mm = /\{\{ill\|[^|}]+\|lt=([^|}]+)\|[a-z]+\}\}/i.exec(rest))){
    // Variante avec paramètre lt= (texte de lien explicite) — priorité sur le 1er paramètre, qui
    // porte ici le désambiguateur "(Municipalité)" hérité du titre d'article Wikipedia.
    name = mm[1];
  } else if((mm = /\{\{ill\|([^|}]+)\|[a-z]+\}\}/i.exec(rest))){
    name = mm[1];
  } else if((mm = /\[\[([^\]|]+)\|([^\]]+)\]\]/.exec(rest))){
    name = mm[2];
  } else if((mm = /\[\[([^\]|]+)\]\]/.exec(rest))){
    name = mm[1];
  } else {
    // Pas de balisage wiki : le nom est le premier segment avant la virgule introduisant l'opérateur
    name = rest.split(',')[0].trim();
  }
  name = name.trim();
  // Le nom peut porter un désambiguateur "(Municipalité)" hérité du titre d'article Wikipedia (ex.
  // "Aleksandrovac (Laktaši)") : gardé tel quel dans nameWithDisambig pour un rapprochement de
  // secours, mais nameBare (sans parenthèses) est la forme prioritaire, celle qu'utilise GeoNames.
  // Deux conventions de désambiguïsation Wikipedia rencontrées : "Nom (Municipalité)" et
  // "Nom, Municipalité" (ex. "Blatnica, Čitluk") — les deux sont retirées pour nameBare, la forme
  // qu'utilise GeoNames (jamais de désambiguateur dans son champ "name").
  const nameBare = name.replace(/\s*\([^)]*\)\s*$/, '').replace(/,\s*[^,]+$/, '').trim();
  entries.push({ cp, nameWithDisambig: name, nameBare });
}

console.log('Entrées codes postaux extraites de Wikipedia :', entries.length);
fs.writeFileSync(path.join(__dirname, 'ba-postal-wiki.json'), JSON.stringify(entries, null, 1), 'utf8');
console.log('-> scripts/ba-postal-wiki.json');
