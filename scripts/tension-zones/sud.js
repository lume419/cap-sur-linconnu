// Zones rouge/orange France Diplomatie — groupe « sud »
// Relevé le 16/09/2026 (pages « Sécurité », date de mise à jour affichée : 15 septembre 2026)
const U = s => `https://www.diplomatie.gouv.fr/fr/information-par-pays/${s}/conseils-aux-voyageurs-securite`;
const D = '2026-09-15';

module.exports = [
  // ───────────── KENYA ─────────────
  {
    country: 'KE', level: 'red',
    label: "Frontière somalienne (bande de 100 km : Mandera, El Wak, Dadaab, Liboi…)",
    match: { borderKm: 100, with: 'SO' },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'red',
    label: "Garissa et route Garissa–Dadaab",
    match: { near: [
      { name: 'Garissa', lat: -0.456, lon: 39.658, km: 12 },
      { name: 'Route Garissa–Dadaab (tronçon ouest)', lat: -0.30, lon: 39.83, km: 15 },
      { name: 'Route Garissa–Dadaab (tronçon est)', lat: -0.12, lon: 40.07, km: 15 }
    ] },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'red',
    label: "Partie continentale du comté de Lamu",
    match: { regions: ['Lamu'] },
    except: { near: [
      { name: 'Île de Lamu', lat: -2.28, lon: 40.88, km: 5 },
      { name: 'Île de Manda', lat: -2.25, lon: 40.96, km: 4 },
      { name: 'Île de Pate', lat: -2.10, lon: 41.02, km: 10 }
    ] },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'orange',
    label: "Archipel de Lamu (accès par voie aérienne uniquement)",
    match: { near: [
      { name: 'Île de Lamu', lat: -2.28, lon: 40.88, km: 5 },
      { name: 'Île de Manda', lat: -2.25, lon: 40.96, km: 4 },
      { name: 'Île de Pate', lat: -2.10, lon: 41.02, km: 10 }
    ] },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'red',
    label: "Frontière avec le Soudan du Sud (triangle d'Ilemi)",
    match: { borderKm: 30, with: 'SS' },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'red',
    label: "Frontière avec l'Éthiopie",
    match: { borderKm: 20, with: 'ET' },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'orange',
    label: "Nord de la Turkana et de Marsabit (bande frontalière Soudan du Sud)",
    match: { borderKm: 60, with: 'SS' },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'orange',
    label: "Nord de Marsabit et Moyale (bande frontalière Éthiopie)",
    match: { borderKm: 45, with: 'ET' },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'orange',
    label: "Comtés de Mandera, Wajir et Garissa (hors zone rouge)",
    match: { regions: ['Mandera County', 'Wajir County', 'Garissa County'] },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'orange',
    label: "Est du comté de Marsabit (régions excentrées)",
    match: { near: [
      { name: 'Est Marsabit (Kargi–Dukana)', lat: 2.30, lon: 38.30, km: 80 },
      { name: 'Nord-est Marsabit', lat: 3.20, lon: 38.60, km: 60 }
    ] },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'orange',
    label: "Est du comté d'Isiolo (Merti, Mado Gashi, Garbatulla)",
    match: { regions: ['Isiolo County'] },
    except: { near: [{ name: 'Isiolo / Archer\'s Post', lat: 0.354, lon: 37.582, km: 50 }] },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'orange',
    label: "Zones frontalières de l'Ouganda (West Pokot et Turkana)",
    match: { near: [
      { name: 'Kacheliba', lat: 1.55, lon: 35.00, km: 25 },
      { name: 'Alale', lat: 2.05, lon: 34.95, km: 25 },
      { name: 'Frontière Turkana sud', lat: 2.55, lon: 34.95, km: 25 },
      { name: 'Lokiriama', lat: 3.05, lon: 34.85, km: 25 },
      { name: 'Frontière Turkana centre', lat: 3.55, lon: 34.50, km: 25 },
      { name: 'Frontière Turkana nord', lat: 4.00, lon: 34.15, km: 25 }
    ] },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'orange',
    label: "Côte au nord de Malindi (jusqu'au comté de Lamu)",
    match: { near: [
      { name: 'Ngomeni / Marafa', lat: -2.95, lon: 40.20, km: 20 },
      { name: 'Kipini / delta de la Tana', lat: -2.55, lon: 40.45, km: 25 }
    ] },
    source: U('kenya'), date: D
  },
  {
    country: 'KE', level: 'orange',
    label: "Nairobi : quartiers d'Eastleigh, Pangani, Kibera et Mathare",
    match: { near: [
      { name: 'Eastleigh', lat: -1.275, lon: 36.850, km: 2 },
      { name: 'Pangani', lat: -1.268, lon: 36.835, km: 1 },
      { name: 'Kibera', lat: -1.313, lon: 36.787, km: 1.8 },
      { name: 'Mathare', lat: -1.260, lon: 36.860, km: 1.2 }
    ] },
    source: U('kenya'), date: D
  },

  // ───────────── OUGANDA ─────────────
  {
    country: 'UG', level: 'red',
    label: "Frontière avec la RDC (hors parcs nationaux)",
    match: { borderKm: 8, with: 'CD' },
    except: { near: [
      { name: 'Arua', lat: 3.02, lon: 30.91, km: 6 },
      { name: 'Kisoro', lat: -1.285, lon: 29.685, km: 4 }
    ] },
    source: U('ouganda'), date: D
  },
  {
    country: 'UG', level: 'red',
    label: "Bwera et ses alentours",
    match: { near: [{ name: 'Bwera', lat: 0.035, lon: 29.77, km: 15 }] },
    source: U('ouganda'), date: D
  },
  {
    country: 'UG', level: 'red',
    label: "Frontière avec le Soudan du Sud",
    match: { borderKm: 8, with: 'SS' },
    source: U('ouganda'), date: D
  },
  {
    country: 'UG', level: 'orange',
    label: "Parc national de Semuliki",
    match: { near: [{ name: 'Parc national de Semuliki', lat: 0.83, lon: 30.10, km: 20 }] },
    source: U('ouganda'), date: D
  },
  {
    country: 'UG', level: 'orange',
    label: "Karamoja (est, le long de la frontière kényane, de Kidepo à Amudat)",
    match: { near: [
      { name: 'Parc national de Kidepo', lat: 3.80, lon: 33.85, km: 30 },
      { name: 'Kaabong', lat: 3.52, lon: 34.12, km: 35 },
      { name: 'Est Kotido', lat: 3.00, lon: 34.45, km: 30 },
      { name: 'Moroto', lat: 2.53, lon: 34.66, km: 30 },
      { name: 'Nakapiripirit', lat: 1.90, lon: 34.75, km: 25 },
      { name: 'Amudat', lat: 1.95, lon: 34.95, km: 25 }
    ] },
    source: U('ouganda'), date: D
  },

  // ───────────── TANZANIE ─────────────
  {
    country: 'TZ', level: 'red',
    label: "Région de Mtwara",
    match: { regions: ['Mtwara'] },
    source: U('tanzanie'), date: D
  },
  {
    country: 'TZ', level: 'red',
    label: "Bande frontalière avec le Mozambique",
    match: { borderKm: 15, with: 'MZ' },
    source: U('tanzanie'), date: D
  },
  {
    country: 'TZ', level: 'orange',
    label: "Kagera et Kigoma : zones frontalières du Burundi",
    match: { borderKm: 30, with: 'BI' },
    source: U('tanzanie'), date: D
  },
  {
    country: 'TZ', level: 'orange',
    label: "Sud-est des régions de Lindi et Ruvuma",
    match: { near: [
      { name: 'Sud Lindi (Lindi, Nachingwea)', lat: -10.20, lon: 39.30, km: 90 },
      { name: 'Est Ruvuma (Tunduru)', lat: -10.80, lon: 37.90, km: 70 }
    ] },
    source: U('tanzanie'), date: D
  },

  // ───────────── BURUNDI ─────────────
  {
    country: 'BI', level: 'red',
    label: "Frontière avec la RDC (entre la frontière et la RN5, chaussée d'Uvira/Gatumba)",
    match: { borderKm: 10, with: 'CD' },
    except: { near: [
      { name: 'Bujumbura', lat: -3.38, lon: 29.36, km: 7 },
      { name: 'Cibitoke', lat: -2.887, lon: 29.12, km: 3 },
      { name: 'Rugombo', lat: -2.84, lon: 29.07, km: 3 }
    ] },
    source: U('burundi'), date: D
  },
  {
    country: 'BI', level: 'red',
    label: "Nord du parc de la Kibira et frontière rwandaise au nord de la RN10",
    match: { near: [
      { name: 'Mabayi', lat: -2.71, lon: 29.25, km: 12 },
      { name: 'Nord Kibira', lat: -2.75, lon: 29.36, km: 10 },
      { name: 'Nord-est Kibira', lat: -2.74, lon: 29.48, km: 9 }
    ] },
    source: U('burundi'), date: D
  },
  {
    country: 'BI', level: 'orange',
    label: "Provinces de Cibitoke et Bubanza (entre la Kibira et la RDC)",
    match: { regions: ['Cibitoke', 'Bubanza'] },
    source: U('burundi'), date: D
  },
  {
    country: 'BI', level: 'orange',
    label: "Centre de la forêt de la Kibira (au nord du mont Teza)",
    match: { near: [{ name: 'Kibira centrale', lat: -3.00, lon: 29.45, km: 12 }] },
    source: U('burundi'), date: D
  },
  {
    country: 'BI', level: 'orange',
    label: "Zone frontalière avec le Rwanda",
    match: { borderKm: 20, with: 'RW' },
    source: U('burundi'), date: D
  },

  // ───────────── ANGOLA ─────────────
  {
    country: 'AO', level: 'orange',
    label: "Provinces de Lunda Norte, Lunda Sul et Cabinda",
    match: { regions: ['Luanda Norte', 'Lunda Sul', 'Cabinda'] },
    source: U('angola'), date: D
  },

  // ───────────── ZAMBIE ─────────────
  {
    country: 'ZM', level: 'orange',
    label: "Frontière avec la RDC (Nord-Ouest et Copperbelt)",
    match: { borderKm: 10, with: 'CD' },
    except: { regions: ['Luapula Province', 'Northern Province'] },
    source: U('zambie'), date: D
  },
  {
    country: 'ZM', level: 'orange',
    label: "Frontière angolaise au nord de Chavuma",
    match: { borderKm: 10, with: 'AO' },
    except: { regions: ['Western Province'] },
    source: U('zambie'), date: D
  },

  // ───────────── MOZAMBIQUE ─────────────
  // Beaucoup de lieux sans région : régions + cercles pour couvrir les lieux au libellé vide.
  {
    country: 'MZ', level: 'red',
    label: "Province du Cabo Delgado (y compris Pemba, Ibo et Quirimbas)",
    match: { regions: ['Cabo Delgado Province'] },
    source: U('mozambique'), date: D
  },
  {
    country: 'MZ', level: 'red',
    label: "Province du Cabo Delgado (y compris Pemba, Ibo et Quirimbas)",
    match: { near: [
      { name: 'Nangade / Palma', lat: -10.90, lon: 39.30, km: 60 },
      { name: 'Mocímboa da Praia / Palma', lat: -10.90, lon: 40.30, km: 60 },
      { name: 'Mueda', lat: -11.70, lon: 38.80, km: 60 },
      { name: 'Muidumbe / Macomia', lat: -11.70, lon: 39.80, km: 60 },
      { name: 'Côte Macomia–Quissanga', lat: -11.80, lon: 40.50, km: 45 },
      { name: 'Ibo / Quirimbas', lat: -12.40, lon: 40.55, km: 30 },
      { name: 'Montepuez', lat: -12.50, lon: 38.80, km: 60 },
      { name: 'Ancuabe / Meluco', lat: -12.50, lon: 39.90, km: 60 },
      { name: 'Pemba', lat: -12.90, lon: 40.50, km: 30 },
      { name: 'Balama / Namuno', lat: -13.20, lon: 39.00, km: 60 },
      { name: 'Chiúre / Mecúfi', lat: -13.20, lon: 40.00, km: 60 }
    ] },
    source: U('mozambique'), date: D
  },
  {
    country: 'MZ', level: 'red',
    label: "Tiers est de la province du Niassa",
    match: { near: [
      { name: 'Mecula / réserve du Niassa', lat: -11.80, lon: 37.80, km: 55 },
      { name: 'Marrupa nord', lat: -12.60, lon: 37.80, km: 55 },
      { name: 'Marrupa / Nipepe', lat: -13.40, lon: 37.90, km: 50 }
    ] },
    source: U('mozambique'), date: D
  },
  {
    country: 'MZ', level: 'red',
    label: "Frontière avec la Tanzanie (Rovuma), jusqu'au Malawi",
    match: { borderKm: 15, with: 'TZ' },
    source: U('mozambique'), date: D
  },
  {
    country: 'MZ', level: 'red',
    label: "Nord de la province de Nampula (Memba, Eráti, Mecubúri, Lalaua, Nacarôa, nord de Nampula/Monapo/Meconta/Nacala)",
    match: { near: [
      { name: 'Lalaua', lat: -14.35, lon: 38.00, km: 40 },
      { name: 'Mecubúri', lat: -14.35, lon: 38.70, km: 40 },
      { name: 'Nord Nampula / Muecate sud', lat: -14.35, lon: 39.40, km: 40 },
      { name: 'Eráti / Nacarôa', lat: -14.35, lon: 40.10, km: 40 },
      { name: 'Memba', lat: -14.17, lon: 40.52, km: 30 }
    ] },
    source: U('mozambique'), date: D
  },
  {
    country: 'MZ', level: 'orange',
    label: "Ouest de la province du Niassa (Lichinga, Cuamba)",
    match: { regions: ['Niassa Province'] },
    source: U('mozambique'), date: D
  },
  {
    country: 'MZ', level: 'orange',
    label: "Ouest de la province du Niassa (Lichinga, Cuamba)",
    match: { near: [
      { name: 'Rive du lac Malawi nord', lat: -12.00, lon: 35.60, km: 60 },
      { name: 'Muembe / Mavago', lat: -12.00, lon: 36.60, km: 60 },
      { name: 'Lichinga', lat: -13.00, lon: 35.30, km: 60 },
      { name: 'Majune', lat: -13.00, lon: 36.50, km: 60 },
      { name: 'Ngauma / Mandimba nord', lat: -13.90, lon: 35.70, km: 50 },
      { name: 'Maúa / Metarica', lat: -13.90, lon: 36.60, km: 50 },
      { name: 'Cuamba', lat: -14.70, lon: 36.30, km: 40 },
      { name: 'Mandimba', lat: -14.70, lon: 35.60, km: 35 }
    ] },
    source: U('mozambique'), date: D
  },
  {
    country: 'MZ', level: 'orange',
    label: "Province de Nampula : villes de Nampula et Nacala, sud de Nacala/Monapo/Nampula, Mossuril, nord de Muecate, Ribáuè, Malema",
    match: { near: [
      { name: 'Nampula', lat: -15.12, lon: 39.27, km: 25 },
      { name: 'Nacala', lat: -14.56, lon: 40.68, km: 20 },
      { name: 'Monapo', lat: -14.92, lon: 40.30, km: 20 },
      { name: 'Mossuril', lat: -14.85, lon: 40.62, km: 15 },
      { name: 'Muecate', lat: -14.90, lon: 39.62, km: 15 },
      { name: 'Ribáuè', lat: -14.97, lon: 38.28, km: 35 },
      { name: 'Entre Ribáuè et Nampula', lat: -15.00, lon: 38.80, km: 25 },
      { name: 'Malema', lat: -14.95, lon: 37.41, km: 35 }
    ] },
    source: U('mozambique'), date: D
  },

  // ───────────── ZIMBABWE ─────────────
  {
    country: 'ZW', level: 'orange',
    label: "Champs diamantifères de Marange",
    match: { near: [{ name: 'Marange (Chiadzwa)', lat: -19.65, lon: 32.36, km: 20 }] },
    source: U('zimbabwe'), date: D
  },
  {
    country: 'ZW', level: 'orange',
    label: "Frontière nord avec le Mozambique (mines antipersonnel)",
    match: { borderKm: 10, with: 'MZ' },
    except: { regions: ['Manicaland', 'Masvingo Province'] },
    source: U('zimbabwe'), date: D
  },
];
