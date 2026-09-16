// Zones rouge/orange France Diplomatie — groupe « centre »
// Consultation le 2026-09-16. « date » = date « Dernière actualisation » de la rubrique « Zones de vigilance »
// (toutes les fiches affichent par ailleurs « Date de mise à jour le : 15 septembre 2026 »).
const U = s => 'https://www.diplomatie.gouv.fr/fr/information-par-pays/' + s + '/conseils-aux-voyageurs-securite';

module.exports = [
  // ───────────── TCHAD ─────────────
  // Carte : tout le pays hors rouge est orange (le texte cite Borkou, Wadi Fira et les villes de Bardaï, Fada, Amdjarass, Bol, Abéché, Bongor).
  { country: 'TD', level: 'orange', label: "Tout le pays (hors zones rouges)", match: { all: true }, source: U('tchad'), date: '2026-03-13' },
  { country: 'TD', level: 'red', label: "Provinces du Tibesti et de l'Ennedi (hors Bardaï, Fada, Amdjarass)",
    match: { regions: ['Tibesti', 'Ennedi-Est', 'Ennedi-Ouest'] },
    except: { near: [
      { name: 'Bardaï', lat: 21.36, lon: 17.00, km: 15 },
      { name: 'Fada', lat: 17.18, lon: 21.58, km: 15 },
      { name: 'Amdjarass', lat: 16.07, lon: 22.84, km: 15 } ] },
    source: U('tchad'), date: '2026-03-13' },
  { country: 'TD', level: 'red', label: "Est de la province du Borkou (approximation par cercle)",
    match: { near: [{ name: 'Est du Borkou', lat: 19.8, lon: 20.8, km: 120 }] }, source: U('tchad'), date: '2026-03-13' },
  { country: 'TD', level: 'red', label: "Province du Lac (hors ville de Bol)",
    match: { regions: ['Lac'] }, except: { near: [{ name: 'Bol', lat: 13.46, lon: 14.71, km: 10 }] },
    source: U('tchad'), date: '2026-03-13' },
  ...['LY', 'NE', 'NG', 'CM', 'CF', 'SD'].map(c => ({
    country: 'TD', level: 'red', label: "Zones frontalières (bande de 30 km, approximation)",
    match: { borderKm: 30, with: c },
    except: { near: [
      { name: "N'Djamena", lat: 12.11, lon: 15.04, km: 20 },
      { name: 'Bongor', lat: 10.28, lon: 15.37, km: 10 } ] },
    source: U('tchad'), date: '2026-03-13' })),

  // ───────────── CENTRAFRIQUE ─────────────
  { country: 'CF', level: 'red', label: "Tout le pays sauf Bangui et Bimbo",
    match: { all: true },
    except: { near: [
      { name: 'Bangui', lat: 4.39, lon: 18.56, km: 12 },
      { name: 'Bimbo', lat: 4.26, lon: 18.42, km: 8 } ] },
    source: U('republique-centrafricaine'), date: '2026-03-12' },
  { country: 'CF', level: 'orange', label: "Bangui et Bimbo",
    match: { near: [
      { name: 'Bangui', lat: 4.39, lon: 18.56, km: 12 },
      { name: 'Bimbo', lat: 4.26, lon: 18.42, km: 8 } ] },
    source: U('republique-centrafricaine'), date: '2026-03-12' },

  // ───────────── CAMEROUN ─────────────
  { country: 'CM', level: 'red', label: "Régions de l'Extrême-Nord et du Nord-Ouest",
    match: { regions: ['Far North', 'North-West'] }, source: U('cameroun'), date: '2026-03-05' },
  { country: 'CM', level: 'red', label: "Département du Mayo-Louti (approximation par cercle autour de Guider)",
    match: { near: [{ name: 'Guider (Mayo-Louti)', lat: 9.93, lon: 13.95, km: 40 }] }, source: U('cameroun'), date: '2026-03-05' },
  { country: 'CM', level: 'red', label: "Frontière avec le Nigéria (30 km)",
    match: { borderKm: 30, with: 'NG' }, source: U('cameroun'), date: '2026-03-05' },
  { country: 'CM', level: 'red', label: "Frontière avec le Tchad (30 km)",
    match: { borderKm: 30, with: 'TD' }, source: U('cameroun'), date: '2026-03-05' },
  { country: 'CM', level: 'red', label: "Frontière avec la Centrafrique (30 km)",
    match: { borderKm: 30, with: 'CF' }, source: U('cameroun'), date: '2026-03-05' },
  { country: 'CM', level: 'red', label: "Presqu'île de Bakassi, parc de Korup et ouest de Kumba et Mamfe (approximation par cercles)",
    match: { near: [
      { name: 'Presqu’île de Bakassi', lat: 4.70, lon: 8.65, km: 25 },
      { name: 'Parc national de Korup', lat: 5.07, lon: 8.85, km: 30 },
      { name: 'Ouest de Kumba', lat: 4.85, lon: 9.10, km: 35 },
      { name: 'Ouest de Mamfe', lat: 5.75, lon: 9.05, km: 30 } ] },
    source: U('cameroun'), date: '2026-03-05' },
  { country: 'CM', level: 'orange', label: "Régions du Nord et du Sud-Ouest",
    match: { regions: ['North', 'South-West'] }, source: U('cameroun'), date: '2026-03-05' },
  { country: 'CM', level: 'orange', label: "Départements de la Vina et du Mbéré (Adamaoua, approximation par cercles)",
    match: { near: [
      { name: 'Ngaoundéré (Vina)', lat: 7.32, lon: 13.58, km: 60 },
      { name: 'Meiganga (Mbéré)', lat: 6.52, lon: 14.29, km: 60 } ] },
    source: U('cameroun'), date: '2026-03-05' },
  { country: 'CM', level: 'orange', label: "Ouest : zones frontalières du Nord-Ouest/Sud-Ouest et abords du lac Bamendjing (approximation par cercles)",
    match: { near: [
      { name: 'Santchou', lat: 5.27, lon: 9.97, km: 15 },
      { name: 'Dschang', lat: 5.45, lon: 10.05, km: 20 },
      { name: 'Mbouda', lat: 5.63, lon: 10.25, km: 20 },
      { name: 'Lac Bamendjing (+20 km)', lat: 5.80, lon: 10.50, km: 35 },
      { name: 'Magba', lat: 5.97, lon: 11.22, km: 20 } ] },
    source: U('cameroun'), date: '2026-03-05' },
  { country: 'CM', level: 'orange', label: "Est : bande frontalière avec la Centrafrique au-delà des 30 km rouges (d'après la carte, ~60 km)",
    match: { borderKm: 60, with: 'CF' }, source: U('cameroun'), date: '2026-03-05' },

  // ───────────── SOUDAN ─────────────
  { country: 'SD', level: 'red', label: "Tout le pays (y compris Khartoum et Port-Soudan)",
    match: { all: true }, source: U('soudan'), date: '2026-03-12' },

  // ───────────── SOUDAN DU SUD ─────────────
  { country: 'SS', level: 'red', label: "Tout le pays sauf Djouba, Wau, Yambio et Aweil",
    match: { all: true },
    except: { near: [
      { name: 'Djouba', lat: 4.85, lon: 31.58, km: 12 },
      { name: 'Wau', lat: 7.70, lon: 27.99, km: 10 },
      { name: 'Yambio', lat: 4.57, lon: 28.40, km: 10 },
      { name: 'Aweil', lat: 8.77, lon: 27.40, km: 10 } ] },
    source: U('soudan-du-sud'), date: '2026-03-12' },
  { country: 'SS', level: 'orange', label: "Djouba, Wau, Yambio et Aweil (accès par voie aérienne uniquement)",
    match: { near: [
      { name: 'Djouba', lat: 4.85, lon: 31.58, km: 12 },
      { name: 'Wau', lat: 7.70, lon: 27.99, km: 10 },
      { name: 'Yambio', lat: 4.57, lon: 28.40, km: 10 },
      { name: 'Aweil', lat: 8.77, lon: 27.40, km: 10 } ] },
    source: U('soudan-du-sud'), date: '2026-03-12' },

  // ───────────── ÉRYTHRÉE ─────────────
  { country: 'ER', level: 'orange', label: "Tout le pays en dehors d'Asmara (et de Massaoua)",
    match: { all: true },
    except: { near: [
      { name: 'Asmara', lat: 15.33, lon: 38.93, km: 12 },
      { name: 'Massaoua', lat: 15.61, lon: 39.45, km: 8 } ] },
    source: U('erythree'), date: '2026-07-10' },
  { country: 'ER', level: 'red', label: "Région de la mer Rouge du Sud (d'après la carte)",
    match: { regions: ['Southern Red Sea'] }, source: U('erythree'), date: '2026-07-10' },
  { country: 'ER', level: 'red', label: "Frontière avec l'Éthiopie (bande ~25 km d'après la carte)",
    match: { borderKm: 25, with: 'ET' }, source: U('erythree'), date: '2026-07-10' },
  { country: 'ER', level: 'red', label: "Frontière avec le Soudan (bande ~25 km d'après la carte)",
    match: { borderKm: 25, with: 'SD' }, source: U('erythree'), date: '2026-07-10' },

  // ───────────── ÉTHIOPIE ─────────────
  { country: 'ET', level: 'red', label: "Régions Amhara, Tigré et Gambela",
    match: { regions: ['Amhara', 'Tigray', 'Gambela'] }, source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'red', label: "Frontière avec l'Érythrée (bande ~30 km)",
    match: { borderKm: 30, with: 'ER' }, source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'red', label: "Frontière avec le Soudan (bande ~30 km)",
    match: { borderKm: 30, with: 'SD' }, source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'red', label: "Frontière avec le Soudan du Sud (bande ~30 km)",
    match: { borderKm: 30, with: 'SS' }, source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'red', label: "Frontière avec le Kenya (bande ~30 km, hors Moyale)",
    match: { borderKm: 30, with: 'KE' }, except: { near: [{ name: 'Moyale', lat: 3.53, lon: 39.05, km: 10 }] },
    source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'red', label: "Frontière avec la Somalie (Ogaden oriental, bande ~80 km d'après la carte)",
    match: { borderKm: 80, with: 'SO' }, source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'red', label: "Ouest Oromia : Wellega Ouest et Est, Horo Guduru, Shewa Ouest/Nord à l'ouest d'Ambo–Fitche (approximation par cercles)",
    match: { near: [
      { name: 'Gimbi (Wellega Ouest)', lat: 9.17, lon: 35.83, km: 80 },
      { name: 'Nekemte (Wellega Est)', lat: 9.09, lon: 36.55, km: 70 },
      { name: 'Shambu (Horo Guduru)', lat: 9.57, lon: 37.10, km: 50 },
      { name: 'Shewa Ouest (ouest Ambo–Fitche)', lat: 9.35, lon: 37.95, km: 55 },
      { name: 'Fitche', lat: 9.80, lon: 38.73, km: 40 } ] },
    source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'orange', label: "Région Somali (ouest de l'Ogaden)",
    match: { regions: ['Somali'] }, source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'orange', label: "Région Benishangul-Gumuz (Metekel, Kamashi)",
    match: { regions: ['Bīnshangul Gumuz'] }, source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'orange', label: "Afar : frontière avec Djibouti (bande ~30 km)",
    match: { borderKm: 30, with: 'DJ' }, source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'orange', label: "Afar : zone frontalière avec le Tigré (approximation par cercle autour d'Abala)",
    match: { near: [{ name: 'Abala', lat: 13.36, lon: 39.75, km: 60 }] }, source: U('ethiopie'), date: '2026-03-05' },
  { country: 'ET', level: 'orange', label: "Oromia : ouest, nord (Shewa), axe Adama–Mieso, Arsi, Guji, Gedeo, Amaro, Burji, Moyale (approximation par cercles)",
    match: { near: [
      { name: 'Ouest Oromia (Wellega/Illubabor)', lat: 9.17, lon: 35.83, km: 150 },
      { name: 'Nord Shewa (Oromia)', lat: 9.70, lon: 38.75, km: 70 },
      { name: 'Adama', lat: 8.54, lon: 39.27, km: 15 },
      { name: 'Axe Adama–Metehara', lat: 8.72, lon: 39.60, km: 15 },
      { name: 'Metehara', lat: 8.90, lon: 39.92, km: 15 },
      { name: 'Awash', lat: 8.98, lon: 40.17, km: 15 },
      { name: 'Axe Awash–Mieso', lat: 9.10, lon: 40.45, km: 15 },
      { name: 'Mieso', lat: 9.23, lon: 40.75, km: 15 },
      { name: 'Arsi', lat: 7.60, lon: 39.60, km: 90 },
      { name: 'Guji (Negele)', lat: 5.33, lon: 39.58, km: 80 },
      { name: 'Gedeo (Dilla)', lat: 6.41, lon: 38.31, km: 25 },
      { name: 'Amaro', lat: 5.83, lon: 37.97, km: 25 },
      { name: 'Burji', lat: 5.47, lon: 37.90, km: 20 },
      { name: 'Moyale', lat: 3.53, lon: 39.05, km: 10 } ] },
    source: U('ethiopie'), date: '2026-03-05' },

  // ───────────── DJIBOUTI ─────────────
  { country: 'DJ', level: 'red', label: "Zone frontalière avec l'Érythrée (bande ~15 km d'après la carte)",
    match: { borderKm: 15, with: 'ER' }, source: U('djibouti'), date: '2026-03-05' },
  { country: 'DJ', level: 'red', label: "Zone frontalière avec la Somalie/Somaliland (route de Loyada, bande ~5 km)",
    match: { borderKm: 5, with: 'SO' }, source: U('djibouti'), date: '2026-03-05' },
  { country: 'DJ', level: 'red', label: "Archipel des Sept-Frères (Sawabi) hors excursions organisées",
    match: { near: [{ name: 'Archipel des Sept-Frères', lat: 12.47, lon: 43.43, km: 10 }] }, source: U('djibouti'), date: '2026-03-05' },

  // ───────────── SOMALIE ─────────────
  { country: 'SO', level: 'red', label: "Tout le pays sauf Hargeisa, Berbera et l'axe qui les relie",
    match: { all: true },
    except: { near: [
      { name: 'Hargeisa', lat: 9.56, lon: 44.06, km: 15 },
      { name: 'Axe Hargeisa–Berbera', lat: 9.80, lon: 44.35, km: 10 },
      { name: 'Axe Hargeisa–Berbera', lat: 10.05, lon: 44.65, km: 10 },
      { name: 'Axe Hargeisa–Berbera', lat: 10.25, lon: 44.85, km: 10 },
      { name: 'Berbera', lat: 10.44, lon: 45.01, km: 10 } ] },
    source: U('somalie'), date: '2026-03-12' },
  { country: 'SO', level: 'orange', label: "Hargeisa, Berbera et l'axe qui les relie (axe approximé par cercles)",
    match: { near: [
      { name: 'Hargeisa', lat: 9.56, lon: 44.06, km: 15 },
      { name: 'Axe Hargeisa–Berbera', lat: 9.80, lon: 44.35, km: 10 },
      { name: 'Axe Hargeisa–Berbera', lat: 10.05, lon: 44.65, km: 10 },
      { name: 'Axe Hargeisa–Berbera', lat: 10.25, lon: 44.85, km: 10 },
      { name: 'Berbera', lat: 10.44, lon: 45.01, km: 10 } ] },
    source: U('somalie'), date: '2026-03-12' },

  // ───────────── CONGO ─────────────
  { country: 'CG', level: 'orange', label: "Frontière avec la Centrafrique (bande de 30 km)",
    match: { borderKm: 30, with: 'CF' }, source: U('congo'), date: '2026-03-05' },
  { country: 'CG', level: 'orange', label: "Frontière avec le Cabinda (Angola) (bande de 10 km)",
    match: { borderKm: 10, with: 'AO' }, source: U('congo'), date: '2026-03-05' },
  { country: 'CG', level: 'orange', label: "Frontière sud avec la RDC (bande de 10 km ; Brazzaville et fleuve au nord exclus)",
    match: { borderKm: 10, with: 'CD' },
    except: { regions: ['Brazzaville', 'Plateaux', 'Cuvette', 'Likouala', 'Sangha'] },
    source: U('congo'), date: '2026-03-05' },

  // ───────────── RD CONGO ─────────────
  { country: 'CD', level: 'orange', label: "Tout le pays (hors zones rouges)",
    match: { all: true }, source: U('republique-democratique-du-congo'), date: '2026-03-12' },
  { country: 'CD', level: 'red', label: "Est du pays : Nord-Kivu, Sud-Kivu, Ituri, Haut-Uele, Tanganyika",
    match: { regions: ['North Kivu', 'South Kivu', 'Ituri', 'Haut-Uele', 'Tanganyika'] },
    source: U('republique-democratique-du-congo'), date: '2026-03-12' },
  { country: 'CD', level: 'red', label: "Provinces du Kwilu et du Kwango",
    match: { regions: ['Kwilu', 'Kwango'] }, source: U('republique-democratique-du-congo'), date: '2026-03-12' },
  { country: 'CD', level: 'red', label: "Territoire de Kwamouth (Mai-Ndombe), Bandundu, plateaux des Bateke et parc de Bombo-Lumene (approximation par cercles)",
    match: { near: [
      { name: 'Kwamouth', lat: -3.18, lon: 16.19, km: 70 },
      { name: 'Bandundu', lat: -3.32, lon: 17.38, km: 20 },
      { name: 'Plateaux Bateke / Bombo-Lumene', lat: -4.42, lon: 16.22, km: 50 } ] },
    source: U('republique-democratique-du-congo'), date: '2026-03-12' },
];
