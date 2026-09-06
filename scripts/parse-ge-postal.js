// Parse la table de codes postaux par commune depuis les 64 pages municipales téléchargées de
// yell.ge (annuaire géorgien, seule source trouvée listant des codes postaux au niveau commune —
// aucun fichier GeoNames n'existe pour la Géorgie, voir commentaire dans build-country-communes.js).
// Chaque page https://www.yell.ge/info/post_indexs.php?id_city=N liste, pour une municipalité,
// une ligne par localité : <div class="col-6 postindex">NOM</div> suivi de
// <div class="col-1 postindex"> CODE</div>. La ville-centre de la municipalité apparaît comme une
// ligne d'en-tête "ქ. <ville-au-génitif>-ის ქუჩების საფოსტო ინდექსი" (littéralement "code postal
// des rues de la ville de X") plutôt que sous son nom nominatif — le géorgien décline le génitif
// différemment selon la voyelle finale du nom (ex. ქუთაისი -> ქუთაისის en ajoutant seulement "ს",
// მცხეთა -> მცხეთის en remplaçant "ა" par "ის"), donc retirer le suffixe par une regex générique
// est peu fiable. Utilise à la place le nom nominatif déjà connu de la page-index principale
// (ge_municipality_names.txt, "id|nom") pour remplacer directement ces lignes d'en-tête par le bon
// nom de ville. Cas spécial : Tbilissi (id=1) est la seule page à détailler des RUES individuelles
// plutôt que des localités (la capitale n'a pas de subdivision en villages) — sans ligne d'en-tête
// récapitulative propre, donc explicitement exclue ici et traitée à part dans build-ge-communes.js
// (code unique 0100, adresse officiellement documentée du siège de la Poste géorgienne).
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dump', 'ge_muni');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== '1.html');

const muniNameById = new Map();
for (const line of fs.readFileSync(path.join(__dirname, 'dump', 'ge_municipality_names.txt'), 'utf8').split('\n')) {
  const [id, name] = line.split('|');
  if (id && name) muniNameById.set(id.trim(), name.trim());
}

const rowRe = /<div class="col-6 postindex">\s*([^<]*?)\s*<\/div>\s*<div class="col-1 postindex">\s*(\d{4})\s*<\/div>/g;
// Le génitif géorgien se décline différemment selon la voyelle finale du nom (voir commentaire
// d'en-tête) : "...ის ქუჩების..." (noms finissant en -ი ou -ა), mais aussi "...ოს ქუჩების..." (noms
// finissant en -ო, ex. საგარეჯო -> საგარეჯოს, წყალტუბო -> წყალტუბოს) — un premier essai ne gérant
// que "-ის" a raté silencieusement Sagarejo/Tsqaltubo/Dedoplistsqaro/Tetritsqaro (aucune substitution
// de nom, donc aucune correspondance possible avec le nom GeoNames). Détecté simplement par le
// suffixe commun "ქუჩების საფოსტო ინდექსი" (indépendant de la déclinaison du nom qui le précède).
const headerRe = /^ქ\..*ქუჩების საფოსტო ინდექსი$/;

const entries = [];
for (const f of files) {
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  const id = path.basename(f, '.html');
  let m;
  rowRe.lastIndex = 0;
  while ((m = rowRe.exec(html))) {
    let name = m[1].trim();
    const cp = m[2].trim();
    if (!name) continue;
    if (headerRe.test(name)) {
      const muniName = muniNameById.get(id);
      if (!muniName) throw new Error('No known municipality name for id ' + id + ' (header row: ' + name + ')');
      name = muniName;
    }
    // Préfixe "ქ. " (= "ville de") devant certains noms de ville dans le corps des lignes normales.
    name = name.replace(/^ქ\.\s*/, '').trim();
    if (!name) continue;
    entries.push({ name, cp, muniId: id });
  }
}

fs.writeFileSync(path.join(__dirname, 'ge-postal-raw.json'), JSON.stringify(entries, null, 1), 'utf8');
console.log('Total rows parsed:', entries.length, 'from', files.length, 'municipality pages (Tbilisi excluded)');
console.log('Sample:', entries.slice(0, 5));
console.log('Unique names:', new Set(entries.map(e => e.name.toLowerCase())).size);
