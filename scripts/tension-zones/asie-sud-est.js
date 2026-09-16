// Zones rouge/orange France Diplomatie — groupe Asie du Sud-Est (consultation 16/09/2026)
// Aucune zone rouge/orange : Brunei, Singapour, Timor oriental, Viêt Nam ; île Christmas et îles Cocos (fiche Australie, vigilance normale).
const FD = 'https://www.diplomatie.gouv.fr/fr/information-par-pays/';
const S = slug => FD + slug + '/conseils-aux-voyageurs-securite';

module.exports = [
  // ---------------- CAMBODGE ---------------- (actualisation 20/04/2026)
  {
    country: 'KH', level: 'red',
    label: "Bande de 30 km le long de la frontière thaïlandaise",
    match: { borderKm: 30, with: 'TH' },
    source: S('cambodge'), date: '2026-04-20'
  },

  // ---------------- INDONÉSIE ---------------- (actualisation 09/03/2026)
  {
    country: 'ID', level: 'orange',
    label: "Papouasie indonésienne (provinces de Papouasie, Papouasie centrale, des Hautes-Terres et du Sud)",
    match: { regions: ['Papua', 'Central Papua', 'Highland Papua', 'South Papua'] },
    source: S('indonesie'), date: '2026-03-09'
  },

  // ---------------- LAOS ---------------- (actualisation 10/03/2026)
  {
    country: 'LA', level: 'orange',
    label: "Zone frontalière avec la Birmanie (approx. 10 km)",
    match: { borderKm: 10, with: 'MM' },
    source: S('laos'), date: '2026-03-10'
  },

  // ---------------- MALAISIE ---------------- (actualisation 10/03/2026)
  {
    country: 'MY', level: 'orange',
    label: "Zone frontalière avec la Thaïlande (approx. 20 km, hors Kangar et Kota Bharu)",
    match: { borderKm: 20, with: 'TH' },
    except: { near: [
      { name: 'Kangar', lat: 6.4414, lon: 100.1986, km: 6 },
      { name: 'Kota Bharu', lat: 6.1236, lon: 102.2433, km: 8 }
    ] },
    source: S('malaisie'), date: '2026-03-10'
  },
  {
    country: 'MY', level: 'orange',
    label: "Côtes nord et est de l'État du Sabah (zone ESSCOM, approx. 30 km à l'intérieur des terres)",
    match: { near: [
      { name: 'Kudat', lat: 6.887, lon: 116.824, km: 30 },
      { name: 'Pitas', lat: 6.715, lon: 117.060, km: 30 },
      { name: 'Paitan', lat: 6.450, lon: 117.400, km: 30 },
      { name: 'Beluran', lat: 5.892, lon: 117.555, km: 30 },
      { name: 'Sandakan', lat: 5.840, lon: 118.118, km: 30 },
      { name: 'Embouchure Kinabatangan', lat: 5.600, lon: 118.450, km: 30 },
      { name: 'Tungku', lat: 5.030, lon: 118.850, km: 30 },
      { name: 'Lahad Datu', lat: 5.023, lon: 118.329, km: 30 },
      { name: 'Kunak', lat: 4.686, lon: 118.253, km: 30 },
      { name: 'Semporna', lat: 4.482, lon: 118.611, km: 30 },
      { name: 'Tawau', lat: 4.245, lon: 117.891, km: 30 }
    ] },
    source: S('malaisie'), date: '2026-03-10'
  },
  {
    country: 'MY', level: 'red',
    label: "Villes de Tawau, Sandakan et Semporna",
    match: { near: [
      { name: 'Tawau', lat: 4.245, lon: 117.891, km: 12 },
      { name: 'Sandakan', lat: 5.840, lon: 118.118, km: 12 },
      { name: 'Semporna', lat: 4.482, lon: 118.611, km: 10 }
    ] },
    source: S('malaisie'), date: '2026-03-10'
  },
  {
    country: 'MY', level: 'red',
    label: "Îles au large des côtes nord et est du Sabah (Banggi, Mabul/Sipadan, îles de Sandakan) — approximation",
    match: { near: [
      { name: 'Île Banggi', lat: 7.250, lon: 117.170, km: 22 },
      { name: 'Île Malawali', lat: 7.040, lon: 117.290, km: 8 },
      { name: 'Mabul / Sipadan', lat: 4.180, lon: 118.630, km: 12 },
      { name: 'Îles des Tortues (Selingan)', lat: 6.170, lon: 118.060, km: 10 }
    ] },
    source: S('malaisie'), date: '2026-03-10'
  },

  // ---------------- BIRMANIE ---------------- (actualisation 04/03/2026)
  {
    country: 'MM', level: 'orange',
    label: "Reste du territoire (Rangoun, Naypyidaw, Mandalay, Bago, Irrawaddy…)",
    match: { all: true },
    source: S('birmanie'), date: '2026-03-04'
  },
  {
    country: 'MM', level: 'red',
    label: "États Kachin, Chin, Rakhine (Arakan), Kayah, Kayin (Karen) ; régions de Sagaing et de Magway",
    match: { regions: ['Kachin State', 'Chin State', 'Rakhine', 'Kayah State', 'Kayin State', 'Sagaing Region', 'Magway'] },
    source: S('birmanie'), date: '2026-03-04'
  },
  {
    country: 'MM', level: 'red',
    label: "État Shan (hors axe central Kalaw–Taunggyi–lac Inle et secteurs de Kunhing et Kengtung)",
    match: { regions: ['Shan State'] },
    except: { near: [
      { name: 'Kalaw', lat: 20.630, lon: 96.560, km: 20 },
      { name: 'Taunggyi', lat: 20.780, lon: 97.030, km: 10 },
      { name: 'Heho / Aungban', lat: 20.720, lon: 96.780, km: 12 },
      { name: 'Nyaungshwe (lac Inle)', lat: 20.660, lon: 96.930, km: 12 },
      { name: 'Kunhing', lat: 21.300, lon: 98.430, km: 35 },
      { name: 'Kengtung', lat: 21.290, lon: 99.610, km: 35 }
    ] },
    source: S('birmanie'), date: '2026-03-04'
  },
  {
    country: 'MM', level: 'red',
    label: "État Mon, sauf la ville de Mawlamyine",
    match: { regions: ['Mon'] },
    except: { near: [{ name: 'Mawlamyine', lat: 16.4905, lon: 97.6282, km: 10 }] },
    source: S('birmanie'), date: '2026-03-04'
  },
  {
    country: 'MM', level: 'red',
    label: "Tenasserim (Tanintharyi) jusqu'à Myeik et le long de la frontière, sauf l'extrême sud",
    match: { regions: ['Tanintharyi Region'] },
    except: { near: [
      { name: 'Sud de Myeik / archipel', lat: 12.100, lon: 98.500, km: 35 },
      { name: 'Bokpyin', lat: 11.270, lon: 98.770, km: 35 },
      { name: 'Côte sud', lat: 10.500, lon: 98.600, km: 30 },
      { name: 'Kawthaung', lat: 9.980, lon: 98.550, km: 25 }
    ] },
    source: S('birmanie'), date: '2026-03-04'
  },
  {
    country: 'MM', level: 'red',
    label: "Est de la région de Bago, le long de l'État Kayin (approximation)",
    match: { near: [
      { name: 'Est de Taungoo', lat: 18.950, lon: 96.720, km: 20 },
      { name: 'Kyaukkyi', lat: 18.330, lon: 96.780, km: 20 },
      { name: 'Shwegyin', lat: 17.920, lon: 96.880, km: 20 },
      { name: 'Madauk / Nyaunglebin est', lat: 17.550, lon: 96.950, km: 15 }
    ] },
    source: S('birmanie'), date: '2026-03-04'
  },
  {
    country: 'MM', level: 'red',
    label: "Nord de la région de Mandalay (secteur de Mogok) — approximation d'après la carte",
    match: { near: [{ name: 'Mogok', lat: 22.920, lon: 96.510, km: 35 }] },
    source: S('birmanie'), date: '2026-03-04'
  },
  {
    country: 'MM', level: 'red',
    label: "Zones frontalières de la Thaïlande (approx. 15 km)",
    match: { borderKm: 15, with: 'TH' },
    // exclusion d'un lieu thaïlandais mal géolocalisé dans les données (« Pyinmagon », en réalité près de Rangoun)
    except: { near: [{ name: 'Pyinmagon (artefact)', lat: 16.9156, lon: 96.6458, km: 16 }] },
    source: S('birmanie'), date: '2026-03-04'
  },
  {
    country: 'MM', level: 'red',
    label: "Zone frontalière du Laos (approx. 15 km)",
    match: { borderKm: 15, with: 'LA' },
    source: S('birmanie'), date: '2026-03-04'
  },

  // ---------------- PHILIPPINES ---------------- (actualisation 11/03/2026)
  {
    country: 'PH', level: 'orange',
    label: "Mindanao : Davao (dont Davao City), Davao del Norte, Davao Oriental, Agusan del Sur, Surigao del Sur, Bukidnon",
    match: { cpPrefix: ['80', '81', '82', '83', '85', '87'] },
    source: S('philippines'), date: '2026-03-11'
  },
  {
    country: 'PH', level: 'orange',
    label: "Misamis oriental à l'ouest de Cagayan de Oro (et la ville de Cagayan de Oro)",
    match: { near: [
      { name: 'Cagayan de Oro', lat: 8.4822, lon: 124.6472, km: 10 },
      { name: 'Ouest Misamis oriental', lat: 8.530, lon: 124.420, km: 20 }
    ] },
    source: S('philippines'), date: '2026-03-11'
  },
  {
    country: 'PH', level: 'red',
    label: "Basilan, Sulu, Tawi-Tawi et ouest de Mindanao (péninsule de Zamboanga, Misamis occidental, Lanao, Maguindanao, Cotabato, Sultan Kudarat, South Cotabato, Sarangani, Compostela Valley, île de Samal)",
    match: { cpPrefix: ['70', '71', '72', '73', '74', '75', '88', '92', '93', '94', '95', '96', '97', '98', '8118', '8119', '8120'] },
    except: { near: [{ name: 'General Santos', lat: 6.1128, lon: 125.1717, km: 12 }] },
    source: S('philippines'), date: '2026-03-11'
  },
  {
    country: 'PH', level: 'red',
    label: "Région autonome musulmane de Mindanao (Bangsamoro)",
    match: { regions: ['Autonomous Region in Muslim Mindanao'] },
    source: S('philippines'), date: '2026-03-11'
  },
  {
    country: 'PH', level: 'orange',
    label: "Ville de General Santos",
    match: { near: [{ name: 'General Santos', lat: 6.1128, lon: 125.1717, km: 12 }] },
    source: S('philippines'), date: '2026-03-11'
  },

  // ---------------- THAÏLANDE ---------------- (actualisation 13/03/2026)
  {
    country: 'TH', level: 'red',
    label: "Provinces de Narathiwat, Pattani, Yala et Songkhla",
    match: { regions: ['Narathiwat', 'Pattani', 'Yala', 'Songkhla'] },
    source: S('thailande'), date: '2026-03-13'
  },
  {
    country: 'TH', level: 'orange',
    label: "Provinces de Satun et de Phatthalung",
    match: { regions: ['Satun', 'Phatthalung'] },
    source: S('thailande'), date: '2026-03-13'
  },
  {
    country: 'TH', level: 'red',
    label: "Frontière avec la Birmanie (approx. 15 km), sauf la ville de Mae Sot",
    match: { borderKm: 15, with: 'MM' },
    except: { near: [{ name: 'Mae Sot', lat: 16.7167, lon: 98.5667, km: 8 }] },
    source: S('thailande'), date: '2026-03-13'
  },
  {
    country: 'TH', level: 'orange',
    label: "Ville de Mae Sot",
    match: { near: [{ name: 'Mae Sot', lat: 16.7167, lon: 98.5667, km: 8 }] },
    source: S('thailande'), date: '2026-03-13'
  },
  {
    country: 'TH', level: 'red',
    label: "Zones frontalières du Cambodge (50 km)",
    match: { borderKm: 50, with: 'KH' },
    source: S('thailande'), date: '2026-03-13'
  },
];
