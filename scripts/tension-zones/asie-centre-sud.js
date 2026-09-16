// Zones rouges/orange France Diplomatie — groupe asie-centre-sud
// Fiches « Sécurité » consultées le 16/09/2026 (date de mise à jour affichée : 15 septembre 2026).
const FD = 'https://www.diplomatie.gouv.fr/fr/information-par-pays/';
const src = (p) => FD + p + '/conseils-aux-voyageurs-securite';
const D = '2026-09-15';

// Pakistan : zone « entre Faisalabad, Lahore et Islamabad » (orange) approximée par des cercles
const PK_TRIANGLE = [
  { name: 'Islamabad / Rawalpindi', lat: 33.65, lon: 73.07, km: 25 },
  { name: 'Jhelum (axe Islamabad-Lahore)', lat: 32.95, lon: 73.45, km: 35 },
  { name: 'Gujrat / Mandi Bahauddin', lat: 32.55, lon: 73.75, km: 40 },
  { name: 'Hafizabad', lat: 32.07, lon: 73.69, km: 40 },
  { name: 'Sheikhupura', lat: 31.71, lon: 73.98, km: 35 },
  { name: 'Lahore', lat: 31.55, lon: 74.30, km: 25 },
  { name: 'Chiniot / Pindi Bhattian', lat: 31.72, lon: 73.30, km: 30 },
  { name: 'Faisalabad', lat: 31.42, lon: 73.08, km: 25 },
];
const PK_MULTAN = { name: 'Multan', lat: 30.20, lon: 71.47, km: 15 };

module.exports = [
  // ---------- Afghanistan : tout rouge
  {
    country: 'AF', level: 'red',
    label: "Totalité du territoire",
    match: { all: true },
    source: src('afghanistan'), date: D,
  },

  // ---------- Kazakhstan : ancien polygone nucléaire de Semipalatinsk
  {
    country: 'KZ', level: 'red',
    label: "Ancien polygone d'essais nucléaires au sud de Kourtchatov et de Semipalatinsk (Semeï) (zone approximée par un cercle)",
    match: { near: [{ name: 'Polygone de Semipalatinsk', lat: 50.10, lon: 78.70, km: 65 }] },
    source: src('kazakhstan'), date: D,
  },

  // ---------- Ouzbékistan
  {
    country: 'UZ', level: 'red',
    label: "Zone frontalière avec l'Afghanistan (bande d'environ 10 km)",
    match: { borderKm: 10, with: 'AF' },
    except: { near: [{ name: 'Termez', lat: 37.22, lon: 67.28, km: 8 }] },
    source: src('ouzbekistan'), date: D,
  },
  {
    country: 'UZ', level: 'orange',
    label: "Ville de Termez",
    match: { near: [{ name: 'Termez', lat: 37.22, lon: 67.28, km: 8 }] },
    source: src('ouzbekistan'), date: D,
  },
  {
    country: 'UZ', level: 'red',
    label: "Abords de la frontière avec le Tadjikistan (mines ; bande d'environ 5 km, hors postes-frontières)",
    match: { borderKm: 5, with: 'TJ' },
    source: src('ouzbekistan'), date: D,
  },
  {
    country: 'UZ', level: 'orange',
    label: "Abords de la frontière avec le Kirghizstan (mines ; bande d'environ 10 km, hors postes-frontières)",
    match: { borderKm: 10, with: 'KG' },
    source: src('ouzbekistan'), date: D,
  },

  // ---------- Tadjikistan
  {
    country: 'TJ', level: 'red',
    label: "Zone frontalière avec l'Afghanistan (dont la route de Khorog le long de la frontière ; bande d'environ 10 km)",
    match: { borderKm: 10, with: 'AF' },
    source: src('tadjikistan'), date: D,
  },
  {
    country: 'TJ', level: 'red',
    label: "Zone frontalière avec l'Ouzbékistan (mines, hors routes et postes-frontières ; bande d'environ 5 km)",
    match: { borderKm: 5, with: 'UZ' },
    source: src('tadjikistan'), date: D,
  },

  // ---------- Turkménistan
  {
    country: 'TM', level: 'red',
    label: "Zone frontalière avec l'Afghanistan (bande d'environ 15 km)",
    match: { borderKm: 15, with: 'AF' },
    source: src('turkmenistan'), date: D,
  },

  // ---------- Bangladesh
  {
    country: 'BD', level: 'orange',
    label: "Ensemble du pays (risque terroriste), dont les Chittagong Hill Tracts",
    match: { all: true },
    source: src('bangladesh'), date: D,
  },
  {
    country: 'BD', level: 'red',
    label: "Zones frontalières de la Birmanie au sud de Bandarban (Teknaf, Ukhia, Naikhongchhari ; bande d'environ 22 km)",
    match: { borderKm: 22, with: 'MM' },
    except: { near: [{ name: 'Hill Tracts au nord de 22°N (orange sur la carte)', lat: 23.00, lon: 92.30, km: 110 }] },
    source: src('bangladesh'), date: D,
  },
  {
    country: 'BD', level: 'red',
    label: "Île de Saint-Martin",
    match: { near: [{ name: 'Île de Saint-Martin', lat: 20.62, lon: 92.32, km: 6 }] },
    source: src('bangladesh'), date: D,
  },

  // ---------- Inde
  {
    country: 'IN', level: 'red',
    label: "Jammu-et-Cachemire (vallée du Cachemire, Srinagar)",
    match: { regions: ['Jammu and Kashmir'] },
    source: src('inde'), date: D,
  },
  {
    country: 'IN', level: 'red',
    label: "Ladakh : secteur de Kargil et route Srinagar-Kargil (cercle de 60 km)",
    match: { near: [{ name: 'Kargil', lat: 34.56, lon: 76.13, km: 60 }] },
    source: src('inde'), date: D,
  },
  {
    country: 'IN', level: 'red',
    label: "Abords immédiats de la ligne de contrôle et de la frontière pakistanaise, dont le poste Wagah-Attari (5 km)",
    match: { borderKm: 5, with: 'PK' },
    source: src('inde'), date: D,
  },
  {
    country: 'IN', level: 'orange',
    label: "Proximité de la frontière indo-pakistanaise (bande d'environ 20 km)",
    match: { borderKm: 20, with: 'PK' },
    source: src('inde'), date: D,
  },
  {
    country: 'IN', level: 'orange',
    label: "Frontière indo-birmane (bande d'environ 20 km)",
    match: { borderKm: 20, with: 'MM' },
    source: src('inde'), date: D,
  },

  // ---------- Pakistan
  {
    country: 'PK', level: 'red',
    label: "Baloutchistan, Khyber-Pakhtunkhwa (dont ex-zones tribales) et Azad Jammu-et-Cachemire",
    match: { regions: ['Balochistan', 'Khyber Pakhtunkhwa', 'Azad Kashmir'] },
    source: src('pakistan'), date: D,
  },
  {
    country: 'PK', level: 'red',
    label: "Pendjab, hors zone Islamabad-Lahore-Faisalabad",
    match: { regions: ['Punjab'] },
    except: { near: [...PK_TRIANGLE, PK_MULTAN] },
    source: src('pakistan'), date: D,
  },
  {
    country: 'PK', level: 'red',
    label: "Frontière avec l'Inde (bande d'environ 10 km)",
    match: { borderKm: 10, with: 'IN' },
    source: src('pakistan'), date: D,
  },
  {
    country: 'PK', level: 'orange',
    label: "Sind (dont Karachi), Gilgit-Baltistan et Islamabad",
    match: { regions: ['Sindh', 'Gilgit-Baltistan', 'Islamabad'] },
    source: src('pakistan'), date: D,
  },
  {
    country: 'PK', level: 'orange',
    label: "Pendjab : zone entre Faisalabad, Lahore et Islamabad (approximée par des cercles)",
    match: { near: PK_TRIANGLE },
    source: src('pakistan'), date: D,
  },
  {
    country: 'PK', level: 'orange',
    label: "Ville de Multan (enclave orange sur la carte)",
    match: { near: [PK_MULTAN] },
    source: src('pakistan'), date: D,
  },
];
