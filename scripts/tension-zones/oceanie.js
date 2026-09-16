// Zones rouges/orange France Diplomatie — lot Océanie (consulté le 16/09/2026)
// Seule la Papouasie-Nouvelle-Guinée comporte des zones rouge/orange.
const SRC_PG = 'https://www.diplomatie.gouv.fr/fr/information-par-pays/papouasie-nouvelle-guinee/conseils-aux-voyageurs-securite';
const D = '2026-09-15';

// Bande frontalière avec l'Indonésie dans la province Ouest (Western Province) :
// la base de lieux indonésiens ne contient pas de localité au sud de ~3,5°S,
// donc borderKm ne couvre que le nord de la frontière. On complète par des
// cercles de 25 km espacés d'environ 33 km le long de la frontière (141°E).
const borderCircles = [
  [-4.8, 141.0], [-5.1, 141.0], [-5.4, 141.0], [-5.7, 141.0], [-6.0, 141.0], [-6.3, 141.0],
  [-6.6, 141.05], [-6.9, 141.05], [-7.2, 141.02], [-7.5, 141.02], [-7.8, 141.02],
  [-8.1, 141.02], [-8.4, 141.02], [-8.7, 141.02], [-9.0, 141.02],
].map(([lat, lon], i) => ({ name: `Frontière PNG-Indonésie ${i + 1}`, lat, lon, km: 25 }));

module.exports = [
  {
    country: 'PG', level: 'red',
    label: "Province d'Enga (Wabag, Porgera)",
    match: { regions: ['Enga Province'] },
    source: SRC_PG, date: D,
  },
  {
    country: 'PG', level: 'orange',
    label: "Highlands et Sepik : provinces de Hela, Enga, Jiwaka, Simbu, Western Highlands, Southern Highlands, Eastern Highlands, Sepik-Ouest (Sandaun) et Sepik-Est",
    match: { regions: [
      'Hela Province', 'Enga Province', 'Jiwaka Province', 'Chimbu Province',
      'Western Highlands Province', 'Southern Highlands Province', 'Eastern Highlands Province',
      'Sandaun Province', 'East Sepik Province',
    ] },
    source: SRC_PG, date: D,
  },
  {
    country: 'PG', level: 'orange',
    label: "Zone frontalière avec l'Indonésie (bande d'environ 25 km)",
    match: { borderKm: 25, with: 'ID' },
    source: SRC_PG, date: D,
  },
  {
    country: 'PG', level: 'orange',
    label: "Zone frontalière avec l'Indonésie (bande d'environ 25 km)",
    match: { near: borderCircles },
    source: SRC_PG, date: D,
  },
  {
    country: 'PG', level: 'orange',
    label: "Villes de Madang, Lae, Rabaul et Alotau et leurs abords (selon la carte)",
    match: { near: [
      { name: 'Madang', lat: -5.224, lon: 145.785, km: 30 },
      { name: 'Lae', lat: -6.733, lon: 147.0, km: 30 },
      { name: 'Rabaul', lat: -4.20, lon: 152.17, km: 10 },
      { name: 'Alotau', lat: -10.31, lon: 150.46, km: 10 },
    ] },
    source: SRC_PG, date: D,
  },
];
