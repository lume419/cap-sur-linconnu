// Serveur minimal : sert le dossier public/ tel quel (HTML, CSS, JS, données), plus une seule
// route API qui va chercher une vraie photo de la commune sur Wikipédia (voir plus bas). Aucune
// donnée du visiteur n'est reçue ni conservée ; le seul état en mémoire est le cache de photos.
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Code département (INSEE) -> nom, utilisé pour désambiguïser les communes homonymes sur
// Wikipédia (ex. il existe trois communes "Thoiry" : Ain, Savoie, Yvelines — l'article vaut
// alors "Thoiry (Ain)", pas "Thoiry"). Source : geo.api.gouv.fr (IGN / Etalab).
const DEPARTMENTS = {"01":"Ain","02":"Aisne","03":"Allier","04":"Alpes-de-Haute-Provence","05":"Hautes-Alpes","06":"Alpes-Maritimes","07":"Ardèche","08":"Ardennes","09":"Ariège","10":"Aube","11":"Aude","12":"Aveyron","13":"Bouches-du-Rhône","14":"Calvados","15":"Cantal","16":"Charente","17":"Charente-Maritime","18":"Cher","19":"Corrèze","2A":"Corse-du-Sud","2B":"Haute-Corse","21":"Côte-d'Or","22":"Côtes-d'Armor","23":"Creuse","24":"Dordogne","25":"Doubs","26":"Drôme","27":"Eure","28":"Eure-et-Loir","29":"Finistère","30":"Gard","31":"Haute-Garonne","32":"Gers","33":"Gironde","34":"Hérault","35":"Ille-et-Vilaine","36":"Indre","37":"Indre-et-Loire","38":"Isère","39":"Jura","40":"Landes","41":"Loir-et-Cher","42":"Loire","43":"Haute-Loire","44":"Loire-Atlantique","45":"Loiret","46":"Lot","47":"Lot-et-Garonne","48":"Lozère","49":"Maine-et-Loire","50":"Manche","51":"Marne","52":"Haute-Marne","53":"Mayenne","54":"Meurthe-et-Moselle","55":"Meuse","56":"Morbihan","57":"Moselle","58":"Nièvre","59":"Nord","60":"Oise","61":"Orne","62":"Pas-de-Calais","63":"Puy-de-Dôme","64":"Pyrénées-Atlantiques","65":"Hautes-Pyrénées","66":"Pyrénées-Orientales","67":"Bas-Rhin","68":"Haut-Rhin","69":"Rhône","70":"Haute-Saône","71":"Saône-et-Loire","72":"Sarthe","73":"Savoie","74":"Haute-Savoie","75":"Paris","76":"Seine-Maritime","77":"Seine-et-Marne","78":"Yvelines","79":"Deux-Sèvres","80":"Somme","81":"Tarn","82":"Tarn-et-Garonne","83":"Var","84":"Vaucluse","85":"Vendée","86":"Vienne","87":"Haute-Vienne","88":"Vosges","89":"Yonne","90":"Territoire de Belfort","91":"Essonne","92":"Hauts-de-Seine","93":"Seine-Saint-Denis","94":"Val-de-Marne","95":"Val-d'Oise","971":"Guadeloupe","972":"Martinique","973":"Guyane","974":"La Réunion","976":"Mayotte"};

// Cache en mémoire (process unique) : évite de refrapper Wikipédia à chaque affichage de la
// même commune. Pas de limite de taille ni de persistance — ~35 000 communes maximum possibles,
// largement soutenable en mémoire pour une chaîne de courtes réponses JSON.
const photoCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function fetchWikiSummary(title){
  const resp = await fetch('https://fr.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title), {
    headers: {
      'User-Agent': 'CapSurLInconnu/1.0 (road trip generator, personal use; https://github.com/lume419/cap-sur-linconnu)',
      'Accept': 'application/json'
    }
  });
  if(!resp.ok) return null;
  return resp.json();
}

// Résout une vraie photo Wikipédia pour une commune. Essaie d'abord "Nom (Département)" quand
// le département est connu (la convention de désambiguïsation de Wikipédia pour les communes
// homonymes), puis "Nom" seul. Si le résultat est une page d'homonymie (plusieurs communes du
// même nom, département inconnu), on renvoie "pas de photo" plutôt qu'une image potentiellement
// fausse — mieux vaut aucune image qu'une image du mauvais endroit.
async function resolvePlacePhoto(name, deptCode){
  const deptName = deptCode && DEPARTMENTS[deptCode];
  const attempts = [];
  if(deptName) attempts.push(name + ' (' + deptName + ')');
  attempts.push(name);

  for(const title of attempts){
    let data;
    try { data = await fetchWikiSummary(title); } catch(e){ console.warn('[photo] échec pour "'+title+'":', e.message); continue; }
    if(!data || data.type === 'disambiguation') continue;
    const image = (data.thumbnail && data.thumbnail.source) || (data.originalimage && data.originalimage.source) || null;
    if(!image) continue;
    // `image` (vignette ~330px) sert à l'affichage rapide dans les tuiles ; `imageFull` (résolution
    // d'origine de l'image Wikimedia, quand elle diffère) est réservée à l'agrandissement en pop-up.
    const imageFull = (data.originalimage && data.originalimage.source) || image;
    return {
      image: image,
      imageFull: imageFull,
      wikiUrl: (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) || null,
      title: data.title || title
    };
  }
  return { image: null, imageFull: null, wikiUrl: null, title: null };
}

app.get('/api/photo', async (req, res) => {
  const name = String(req.query.name || '').trim();
  const dept = String(req.query.dept || '').trim();
  if(!name || name.length > 120){
    return res.status(400).json({ error: 'invalid name' });
  }
  const cacheKey = name + '|' + dept;
  const cached = photoCache.get(cacheKey);
  if(cached && (Date.now() - cached.ts) < CACHE_TTL_MS){
    return res.json(cached.data);
  }
  let data;
  try {
    data = await resolvePlacePhoto(name, dept);
  } catch(err){
    data = { image: null, imageFull: null, wikiUrl: null, title: null };
  }
  photoCache.set(cacheKey, { data, ts: Date.now() });
  res.json(data);
});

app.use(express.static(path.join(__dirname, 'public'), {
  // Les données (communes.txt, featured.txt, france-map.json) sont volumineuses mais
  // statiques : autant laisser les navigateurs les mettre en cache longtemps. En revanche
  // le HTML/CSS/JS change à chaque mise à jour de l'app — un cache d'1h dessus faisait qu'un
  // simple rechargement de page pouvait continuer à servir une ancienne version depuis le
  // cache navigateur sans même revalider auprès du serveur. On force donc une revalidation
  // systématique (`must-revalidate`) pour ces fichiers, tout en gardant le cache long pour
  // /data/ qui est volumineux et ne change qu'avec le code (donc avec un nouveau déploiement).
  maxAge: '1h',
  extensions: ['html'],
  setHeaders: function(res, filePath){
    if(!/[\\/]data[\\/]/.test(filePath)){
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`Cap sur l'Inconnu — http://localhost:${PORT}`);
});
