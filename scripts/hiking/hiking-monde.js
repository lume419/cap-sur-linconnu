// Portails de randonnée par pays — région « monde » (hors Europe)
// Couverture : Amériques (Canada, États-Unis, Mexique, Amérique centrale et du Sud, Caraïbes),
//   Océanie, Asie (Japon, Corée du Sud, Chine, Taïwan, Hong Kong, Asie du Sud-Est, du Sud, centrale),
//   Moyen-Orient, Afrique. La Turquie, Chypre et le Caucase sont laissés à la région europe.
// Méthode (2026-09-17) : repérage via recherche web et sites connus, puis vérification de chaque URL
//   par curl (HTML rendu côté serveur) ou dans un vrai navigateur quand la page est rendue en JavaScript.
//   Chaque modèle {town}/{lat}/{lon} a été testé sur au moins deux lieux réels. Aucun contrôle anti-robot
//   n'a été contourné : les sites bloqués ou injoignables ne sont pas retenus.
// Limites :
//   - Très peu de portails permettent une recherche par URL (US Recreation.gov, AU Trail Hiking Australia) ;
//     les autres sont des pages nationales de liste (searchByUrl: false).
//   - Plusieurs pages ne sont que dans la langue du pays (KR, TW liste EN, HK en chinois par défaut, JP env.go.jp, IL en hébreu).
//   - Pays sans portail utile ou non vérifiable : non listés (voir rapport).
//   - Aucune donnée n'est récupérée : simple lien « Plus de randonnées ».
module.exports = {
  visorandoCountries: [],
  portals: [
    // ---------- Amériques ----------
    { country: 'US', name: 'Recreation.gov', url: 'https://www.recreation.gov/search?q={town}', searchByUrl: true, official: true,
      verified: 'Moab : Arches, Canyonlands, permis de randonnée ; Estes Park : Rocky Mountain NP, sentiers (2026-09-17). Liste des sites fédéraux (parcs, forêts, sentiers, permis), pas uniquement des randonnées',
      source: 'https://www.recreation.gov/' },
    { country: 'US', name: 'NPS – Where Can I Hike?', url: 'https://www.nps.gov/subjects/trails/where-can-i-hike.htm', searchByUrl: false, official: true,
      verified: 'Page nationale du National Park Service vers les sentiers des parcs (2026-09-17)',
      source: 'https://www.nps.gov/subjects/trails/index.htm' },
    { country: 'CA', name: 'Parks Canada – Hiking', url: 'https://parks.canada.ca/voyage-travel/experiences/sports/randonnee-hiking', searchByUrl: false, official: true,
      verified: 'Page « Hiking at Parks Canada » : meilleures randonnées par province, état des sentiers (2026-09-17)',
      source: 'https://parks.canada.ca/' },
    { country: 'CA', name: 'Trans Canada Trail', url: 'https://tctrail.ca/explore-the-map/', searchByUrl: false, official: false,
      verified: 'Carte interactive du réseau Trans Canada Trail (2026-09-17). Organisme caritatif, non public',
      source: 'https://tctrail.ca/' },
    { country: 'GL', name: 'Visit Greenland – Hiking', url: 'https://visitgreenland.com/activities/hiking/', searchByUrl: false, official: true,
      verified: 'Page randonnée de l\'office du tourisme : Arctic Circle Trail, sentiers du Sud (2026-09-17)',
      source: 'https://visitgreenland.com/' },
    { country: 'BR', name: 'Rede Brasileira de Trilhas', url: 'https://redetrilhas.org.br/w3/index.php/as-trilhas/as-trilhas-da-rede', searchByUrl: false, official: false,
      verified: 'Liste des sentiers du réseau : Transmantiqueira, Transcarioca, Caminho das Araucárias… (2026-09-17). Réseau associatif lié à la RedeTrilhas du ministère de l\'Environnement',
      source: 'https://www.gov.br/mma/pt-br/assuntos/biodiversidade-e-biomas/gestao-integrada-de-paisagem/rede-trilhas' },
    { country: 'CL', name: 'CONAF – Nuestros Parques', url: 'https://www.conaf.cl/parques-nacionales/nuestros-parques/', searchByUrl: false, official: true,
      verified: 'Liste des parcs nationaux ; fiches parc avec sentiers (ex. Torres del Paine) (2026-09-17)',
      source: 'https://www.conaf.cl/' },

    // ---------- Océanie ----------
    { country: 'AU', name: 'Trail Hiking Australia', url: 'https://www.trailhiking.com.au/search/?geodir_search=1&stype=gd_place&s=&snear={town}&sgeo_lat={lat}&sgeo_lon={lon}', searchByUrl: true, official: false,
      verified: 'Katoomba : Federal Pass, Leura Cascades, Prince Henry Cliff Walk ; Hobart : Cascade Walking Track, Battery Point (2026-09-17). Site indépendant (~3 800 fiches), pas de portail public national (parcs gérés par État)',
      source: 'https://www.trailhiking.com.au/about-trail-hiking-australia/' },
    { country: 'NZ', name: 'DOC – Walking and tramping', url: 'https://www.doc.govt.nz/parks-and-recreation/things-to-do/walking-and-tramping/', searchByUrl: false, official: true,
      verified: 'Page du Department of Conservation : Great Walks, Plan my walk, recherche par région (2026-09-17). Recherche plein texte du site rendue en JS, non exploitable par URL',
      source: 'https://www.doc.govt.nz/' },

    // ---------- Asie ----------
    { country: 'JP', name: '環境省 長距離自然歩道', url: 'https://www.env.go.jp/nature/nationalparks/pick-up/long-trail/', searchByUrl: false, official: true,
      verified: 'Liste des sentiers longue distance du ministère de l\'Environnement : Tōkai, Kinki, Michinoku Shiokaze Trail… (2026-09-17). En japonais',
      source: 'https://www.env.go.jp/nature/long-trail.html' },
    { country: 'JP', name: 'Japan National Parks – Hiking', url: 'https://www.japan.travel/national-parks/things-to-see-and-do/hiking/', searchByUrl: false, official: true,
      verified: 'Randonnées des parcs nationaux (JNTO/ministère de l\'Environnement) : Mount Iwate Yakehashiri Trail, Ochudo (Fuji)… (2026-09-17)',
      source: 'https://www.japan.travel/national-parks/' },
    { country: 'KR', name: 'Durunubi (두루누비)', url: 'https://durunubi.kr/road-walk.do', searchByUrl: false, official: true,
      verified: 'Liste de 540 itinéraires de marche (Korea Tourism Organization) ; le paramètre keyword ne cherche que les noms coréens des sentiers (2026-09-17)',
      source: 'https://durunubi.kr/' },
    { country: 'KR', name: 'Korea National Park – 탐방로', url: 'https://www.knps.or.kr/front/portal/trails/search.do?menuNo=8000754', searchByUrl: false, official: true,
      verified: 'Recherche des sentiers des parcs nationaux : Gayasan, Gyeongju (durée, difficulté) (2026-09-17). En coréen, filtres en POST',
      source: 'https://www.knps.or.kr/portal/main.do' },
    { country: 'TW', name: 'Taiwan National Trails', url: 'https://www.forest.gov.tw/en/trail?p=0', searchByUrl: false, official: true,
      verified: 'Liste des sentiers nationaux (Forestry and Nature Conservation Agency) : Alishan Giant Trees Trail, Antong Traversing Trail… (2026-09-17)',
      source: 'https://www.forest.gov.tw/EN/national_trails' },
    { country: 'HK', name: 'Enjoy Hiking (郊野樂行)', url: 'https://www.hiking.gov.hk/trail', searchByUrl: false, official: true,
      verified: 'Liste des sentiers AFCD filtrable par district, type, difficulté : Aberdeen Nature Trail, MacLehose Trail… (2026-09-17). Chinois par défaut, bascule anglaise par session',
      source: 'https://www.hiking.gov.hk/' },
    { country: 'SG', name: 'NParks – Nature walks', url: 'https://www.nparks.gov.sg/visit/activities/nature-walks-tours', searchByUrl: false, official: true,
      verified: 'Promenades en autonomie dans les parcs : Lower Peirce Reservoir, Hindhede Nature Park… (2026-09-17)',
      source: 'https://www.nparks.gov.sg/' },
    { country: 'NP', name: 'Nepal Tourism Board – Trekking', url: 'https://ntb.gov.np/en/things-to-do/trekking', searchByUrl: false, official: true,
      verified: 'Page trekking de l\'office national : régions de trek, Great Himalaya Trail, permis (2026-09-17)',
      source: 'https://ntb.gov.np/' },
    { country: 'BT', name: 'Trans Bhutan Trail', url: 'https://www.transbhutantrail.com/about-the-trans-bhutan-trail', searchByUrl: false, official: false,
      verified: 'Sentier de 403 km de Haa à Trashigang restauré sous patronage royal (2026-09-17). Géré par la Bhutan Canada Foundation, propose aussi des séjours payants',
      source: 'https://www.transbhutantrail.com/' },
    { country: 'LK', name: 'The Pekoe Trail', url: 'https://thepekoetrail.org/', searchByUrl: false, official: false,
      verified: 'Sentier de 22 étapes dans les collines à thé, état des étapes mis à jour en juillet 2026 (2026-09-17)',
      source: 'https://thepekoetrail.org/' },

    // ---------- Moyen-Orient ----------
    { country: 'IL', name: 'Rashut HaTeva – Trails', url: 'https://www.parks.org.il/%d7%9e%d7%a1%d7%9c%d7%95%d7%9c%d7%99-%d7%98%d7%99%d7%95%d7%9c/', searchByUrl: false, official: true,
      verified: 'Recherche des sentiers de l\'Autorité de la nature et des parcs, filtre par région (2026-09-17). En hébreu',
      source: 'https://en.parks.org.il/' },
    { country: 'JO', name: 'Jordan Trail', url: 'https://www.jordantrail.org/', searchByUrl: false, official: false,
      verified: 'Étapes d\'Um Qais à la mer Rouge : Ajloun, Dana, Petra… (2026-09-17). Jordan Trail Association (ONG)',
      source: 'https://www.jordantrail.org/' },
    { country: 'LB', name: 'Lebanon Mountain Trail', url: 'https://www.lebanontrail.org/hike-the-lmt-map-section', searchByUrl: false, official: false,
      verified: 'Carte et sections du LMT, balisage, trace KMZ (2026-09-17). Lebanon Mountain Trail Association (ONG), page rendue en JS',
      source: 'https://www.lebanontrail.org/' },
    { country: 'PS', name: 'Masar Ibrahim al-Khalil', url: 'https://masaribrahim.ps/trail/', searchByUrl: false, official: false,
      verified: 'Étapes du sentier : Rummana–Burqin, Sabastiya–Nablus, Al-Auja–Jericho, Bethléem… (2026-09-17). Association palestinienne',
      source: 'https://masaribrahim.ps/' },

    // ---------- Afrique ----------
    { country: 'ZA', name: 'SANParks – Hikes & Trails', url: 'https://www.sanparks.org/travel/plan/what-to-do/activities/hikes-walks-trails', searchByUrl: false, official: true,
      verified: 'Randonnées par parc national : Garden Route, Table Mountain, Kruger… (vérifié en navigateur, curl bloqué par Cloudflare) (2026-09-17)',
      source: 'https://www.sanparks.org/' }
  ]
};
