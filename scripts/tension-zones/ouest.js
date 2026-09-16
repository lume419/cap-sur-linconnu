// Zones rouge/orange France Diplomatie — groupe « ouest »
// Relevé le 2026-09-16 sur les pages « Sécurité » (fiches datées « Date de mise à jour le : 15 septembre 2026 »).
const FD = 'https://www.diplomatie.gouv.fr/fr/information-par-pays/';
const src = s => FD + s + '/conseils-aux-voyageurs-securite';
const D = '2026-09-15';

module.exports = [
  // ---------------- MAURITANIE ----------------
  {
    country: 'MR', level: 'red',
    label: "Bande frontalière avec le Mali",
    match: { borderKm: 50, with: 'ML' },
    source: src('mauritanie'), date: D
  },
  {
    country: 'MR', level: 'red',
    label: "Hodh Ech Chargui et Hodh El Gharbi (sud-est de la ligne Akreijit–Kankossa, approx. par wilayas)",
    match: { regions: ['Hodh Ech Chargi', 'Hodh El Gharbi'] },
    source: src('mauritanie'), date: D
  },
  {
    country: 'MR', level: 'red',
    label: "Nord-est : au nord de Zouérate et au nord-est de la ligne Zouérate–Ghallaouia (approx. : Tiris Zemmour hors Zouérate/F'Dérik)",
    match: { regions: ['Tiris Zemmour'] },
    except: { near: [
      { name: 'Zouérate', lat: 22.735, lon: -12.471, km: 25 },
      { name: "F'Dérik", lat: 22.679, lon: -12.708, km: 15 }
    ] },
    source: src('mauritanie'), date: D
  },
  {
    country: 'MR', level: 'orange',
    label: "Zouérate et F'Dérik (au nord de la ligne Choum–Aghouedir)",
    match: { near: [
      { name: 'Zouérate', lat: 22.735, lon: -12.471, km: 25 },
      { name: "F'Dérik", lat: 22.679, lon: -12.708, km: 15 }
    ] },
    source: src('mauritanie'), date: D
  },
  {
    country: 'MR', level: 'orange',
    label: "Zone frontalière avec le Sahara occidental de Nouadhibou à Zouérate (hors ville de Nouadhibou)",
    match: { borderKm: 25, with: 'EH' },
    except: { near: [{ name: 'Nouadhibou', lat: 20.94, lon: -17.04, km: 15 }] },
    source: src('mauritanie'), date: D
  },
  {
    country: 'MR', level: 'orange',
    label: "Assaba, Gorgol et Guidimakha (sud-est de la ligne Tichit–Kaédi)",
    match: { regions: ['Assaba', 'Gorgol', 'Guidimaka'] },
    source: src('mauritanie'), date: D
  },
  {
    country: 'MR', level: 'orange',
    label: "Adrar et Tagant à l'est de la ligne Aghouedir–Tichit (approx. : wilayas hors Atar, Chinguetti, Aoujeft, Tidjikja, Moudjéria)",
    match: { regions: ['Adrar', 'Tagant'] },
    except: { near: [
      { name: 'Atar', lat: 20.517, lon: -13.049, km: 50 },
      { name: 'Chinguetti', lat: 20.463, lon: -12.364, km: 25 },
      { name: 'Aoujeft', lat: 20.03, lon: -13.05, km: 25 },
      { name: 'Tidjikja', lat: 18.556, lon: -11.427, km: 50 },
      { name: 'Moudjéria', lat: 17.88, lon: -12.33, km: 40 }
    ] },
    source: src('mauritanie'), date: D
  },

  // ---------------- MALI ----------------
  {
    country: 'ML', level: 'red',
    label: "Ensemble du territoire",
    match: { all: true },
    source: src('mali'), date: D
  },

  // ---------------- SÉNÉGAL ----------------
  {
    country: 'SN', level: 'orange',
    label: "Zone frontalière avec le Mali",
    match: { borderKm: 30, with: 'ML' },
    source: src('senegal'), date: D
  },
  {
    country: 'SN', level: 'orange',
    label: "Frontière avec la Mauritanie dans la région de Matam",
    match: { borderKm: 20, with: 'MR' },
    except: { regions: ['Saint-Louis', 'Louga', 'Tambacounda'] },
    source: src('senegal'), date: D
  },
  {
    country: 'SN', level: 'orange',
    label: "Casamance : frontière avec la Gambie (hors axes routiers principaux)",
    match: { borderKm: 10, with: 'GM' },
    except: { regions: ['Fatick', 'Kaolack', 'Kaffrine', 'Tambacounda'] },
    source: src('senegal'), date: D
  },
  {
    country: 'SN', level: 'orange',
    label: "Casamance : bande frontalière avec la Guinée-Bissau au sud de Ziguinchor (hors axe Ziguinchor–frontière)",
    match: { borderKm: 10, with: 'GW' },
    except: { regions: ['Sédhiou', 'Kolda'] },
    source: src('senegal'), date: D
  },

  // ---------------- GUINÉE ----------------
  {
    country: 'GN', level: 'orange',
    label: "Zone frontalière avec le Mali (dont Siguiri et Mandiana)",
    match: { borderKm: 50, with: 'ML' },
    source: src('guinee'), date: D
  },
  {
    country: 'GN', level: 'orange',
    label: "Zone frontalière avec la Côte d'Ivoire (dont réserve naturelle de Kankan)",
    match: { borderKm: 50, with: 'CI' },
    source: src('guinee'), date: D
  },
  {
    country: 'GN', level: 'orange',
    label: "Villes de Siguiri et Mandiana",
    match: { near: [
      { name: 'Siguiri', lat: 11.42, lon: -9.17, km: 15 },
      { name: 'Mandiana', lat: 10.63, lon: -8.69, km: 15 }
    ] },
    source: src('guinee'), date: D
  },

  // ---------------- GUINÉE-BISSAU ----------------
  {
    country: 'GW', level: 'orange',
    label: "Zone frontalière avec le Sénégal",
    match: { borderKm: 20, with: 'SN' },
    source: src('guinee-bissao'), date: D
  },

  // ---------------- SIERRA LEONE ----------------
  {
    country: 'SL', level: 'orange',
    label: "Zone frontalière avec le Liberia",
    match: { borderKm: 25, with: 'LR' },
    source: src('sierra-leone'), date: D
  },

  // ---------------- LIBERIA ----------------
  {
    country: 'LR', level: 'orange',
    label: "Zones frontalières avec la Sierra Leone (Grand Cape Mount, Gbarpolu, Lofa)",
    match: { borderKm: 20, with: 'SL' },
    source: src('liberia'), date: D
  },
  {
    country: 'LR', level: 'orange',
    label: "Zones frontalières avec la Côte d'Ivoire (Nimba au sud de Buutuo, Grand Gedeh, River Gee, Maryland)",
    match: { borderKm: 20, with: 'CI' },
    except: { near: [{ name: 'Nimba nord (au nord de Buutuo)', lat: 7.25, lon: -8.45, km: 40 }] },
    source: src('liberia'), date: D
  },

  // ---------------- BURKINA FASO ----------------
  {
    country: 'BF', level: 'red',
    label: "Ensemble du territoire",
    match: { all: true },
    source: src('burkina-faso'), date: D
  },

  // ---------------- CÔTE D'IVOIRE ----------------
  {
    country: 'CI', level: 'red',
    label: "Zone frontalière avec le Mali",
    match: { borderKm: 30, with: 'ML' },
    source: src('cote-d-ivoire'), date: D
  },
  {
    country: 'CI', level: 'red',
    label: "Zone frontalière avec le Burkina Faso",
    match: { borderKm: 30, with: 'BF' },
    source: src('cote-d-ivoire'), date: D
  },
  {
    country: 'CI', level: 'red',
    label: "Nord du Zanzan, est des Savanes et parc national de la Comoé (approx. par cercles)",
    match: { near: [
      { name: 'Parc national de la Comoé', lat: 8.80, lon: -3.80, km: 65 },
      { name: 'Bouna (nord Zanzan)', lat: 9.27, lon: -3.00, km: 50 },
      { name: 'Kong (est Savanes)', lat: 9.15, lon: -4.61, km: 40 },
      { name: 'Ferkessédougou (est Savanes)', lat: 9.59, lon: -5.19, km: 30 }
    ] },
    source: src('cote-d-ivoire'), date: D
  },
  {
    country: 'CI', level: 'orange',
    label: "Zone frontalière avec le Liberia (dont Tabou, Taï, Grabo)",
    match: { borderKm: 30, with: 'LR' },
    source: src('cote-d-ivoire'), date: D
  },
  {
    country: 'CI', level: 'orange',
    label: "Villes de Tabou, Taï et Grabo",
    match: { near: [
      { name: 'Tabou', lat: 4.42, lon: -7.35, km: 10 },
      { name: 'Taï', lat: 5.87, lon: -7.45, km: 10 },
      { name: 'Grabo', lat: 4.92, lon: -7.50, km: 10 }
    ] },
    source: src('cote-d-ivoire'), date: D
  },

  // ---------------- GHANA ----------------
  {
    country: 'GH', level: 'red',
    label: "Frontière nord avec le Burkina Faso (dont Tumu, Navrongo, Bawku)",
    match: { borderKm: 25, with: 'BF' },
    except: { regions: ['Upper West', 'Savannah'] },
    source: src('ghana'), date: D
  },
  {
    country: 'GH', level: 'red',
    label: "Tumu, Navrongo et Bawku",
    match: { near: [
      { name: 'Tumu', lat: 10.88, lon: -1.98, km: 30 },
      { name: 'Navrongo', lat: 10.89, lon: -1.09, km: 10 },
      { name: 'Bawku', lat: 11.06, lon: -0.24, km: 10 }
    ] },
    source: src('ghana'), date: D
  },
  {
    country: 'GH', level: 'orange',
    label: "Frontière ouest avec le Burkina Faso",
    match: { borderKm: 25, with: 'BF' },
    source: src('ghana'), date: D
  },
  {
    country: 'GH', level: 'orange',
    label: "Parc (réserve) de Gbelé et ses environs",
    match: { near: [{ name: 'Gbele Resource Reserve', lat: 10.52, lon: -2.22, km: 25 }] },
    source: src('ghana'), date: D
  },
  {
    country: 'GH', level: 'orange',
    label: "Partie nord-ouest de la frontière avec la Côte d'Ivoire",
    match: { borderKm: 25, with: 'CI' },
    except: { regions: ['Western', 'Western North', 'Ahafo'] },
    source: src('ghana'), date: D
  },
  {
    country: 'GH', level: 'orange',
    label: "Frontière avec le Togo du nord-est de Gambaga au sud de Chunbawso (bande de 5 à 10 km)",
    match: { borderKm: 10, with: 'TG' },
    except: { regions: ['Upper East', 'Oti', 'Volta'] },
    source: src('ghana'), date: D
  },
  {
    country: 'GH', level: 'orange',
    label: "Zone entre Bimbilla et la frontière togolaise (approx. par cercle)",
    match: { near: [{ name: 'Bimbilla – frontière togolaise', lat: 8.95, lon: 0.20, km: 30 }] },
    source: src('ghana'), date: D
  },

  // ---------------- TOGO ----------------
  {
    country: 'TG', level: 'red',
    label: "Zone des triples frontières (Burkina/Togo/Ghana et Burkina/Togo/Bénin), passages de Sinkassé et Mandouri",
    match: { near: [
      { name: 'Triple frontière BF/TG/GH – Sinkassé', lat: 11.10, lon: 0.00, km: 25 },
      { name: 'Triple frontière BF/TG/BJ', lat: 11.00, lon: 0.92, km: 25 },
      { name: 'Mandouri', lat: 10.85, lon: 0.82, km: 10 }
    ] },
    source: src('togo'), date: D
  },
  {
    country: 'TG', level: 'orange',
    label: "Région des Savanes (dont Dapaong)",
    match: { regions: ['Savanes'] },
    source: src('togo'), date: D
  },

  // ---------------- BÉNIN ----------------
  {
    country: 'BJ', level: 'red',
    label: "Zone frontalière du Burkina Faso",
    match: { borderKm: 30, with: 'BF' },
    source: src('benin'), date: D
  },
  {
    country: 'BJ', level: 'red',
    label: "Zone frontalière du Niger",
    match: { borderKm: 30, with: 'NE' },
    source: src('benin'), date: D
  },
  {
    country: 'BJ', level: 'red',
    label: "Parcs de la Pendjari et du W et zones mitoyennes, Banikoara",
    match: { near: [
      { name: 'Parc national de la Pendjari', lat: 11.10, lon: 1.50, km: 45 },
      { name: 'Parc national du W (Bénin)', lat: 11.90, lon: 2.60, km: 60 },
      { name: 'Banikoara', lat: 11.30, lon: 2.44, km: 15 }
    ] },
    source: src('benin'), date: D
  },
  {
    country: 'BJ', level: 'red',
    label: "Frontière nord-ouest avec le Togo (Atakora)",
    match: { borderKm: 30, with: 'TG' },
    except: { regions: ['Donga', 'Collines', 'Plateau', 'Zou', 'Kouffo', 'Mono', 'Atlantique', 'Littoral'] },
    source: src('benin'), date: D
  },
  {
    country: 'BJ', level: 'red',
    label: "Frontière nord-est avec le Nigeria jusqu'aux environs de Nikki",
    match: { borderKm: 30, with: 'NG' },
    except: { regions: ['Borgou', 'Collines', 'Plateau', 'Ouémé', 'Zou', 'Atlantique', 'Littoral'] },
    source: src('benin'), date: D
  },
  {
    country: 'BJ', level: 'red',
    label: "Frontière nord-est avec le Nigeria, partie Borgou au nord de Nikki (approx. par cercle)",
    match: { near: [{ name: 'Kalalé – frontière', lat: 10.30, lon: 3.45, km: 35 }] },
    source: src('benin'), date: D
  },
  {
    country: 'BJ', level: 'orange',
    label: "Atakora (Tanguiéta, Natitingou, Boukoumbé, Kouandé)",
    match: { regions: ['Atakora'] },
    source: src('benin'), date: D
  },
  {
    country: 'BJ', level: 'orange',
    label: "Bande Kandi–Tchaourou incluant Nikki (approx. par cercles)",
    match: { near: [
      { name: 'Kandi', lat: 11.13, lon: 2.94, km: 30 },
      { name: 'Kandi–Nikki', lat: 10.55, lon: 3.00, km: 30 },
      { name: 'Nikki', lat: 9.94, lon: 3.21, km: 30 },
      { name: 'Nikki–Tchaourou', lat: 9.40, lon: 2.95, km: 30 },
      { name: 'Tchaourou', lat: 8.89, lon: 2.60, km: 25 }
    ] },
    source: src('benin'), date: D
  },

  // ---------------- NIGER ----------------
  {
    country: 'NE', level: 'red',
    label: "Ensemble du territoire",
    match: { all: true },
    source: src('niger'), date: D
  },

  // ---------------- NIGERIA ----------------
  {
    country: 'NG', level: 'red',
    label: "Nord-Est et Nord-Ouest : États de Borno, Yobe, Gombe, Bauchi, Jigawa, Kebbi, Zamfara, Katsina, Sokoto",
    match: { regions: ['Borno State', 'Yobe State', 'Gombe State', 'Bauchi', 'Jigawa State', 'Kebbi', 'Zamfara State', 'Katsina State', 'Sokoto'] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'red',
    label: "États de Kano et Kaduna (hors villes de Kano et Kaduna)",
    match: { regions: ['Kano State', 'Kaduna State'] },
    except: { near: [
      { name: 'Kano', lat: 12.00, lon: 8.52, km: 20 },
      { name: 'Kaduna', lat: 10.52, lon: 7.44, km: 20 }
    ] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'red',
    label: "Sud-Est : États de Bayelsa, Rivers (hors Port Harcourt), Delta et Akwa Ibom",
    match: { regions: ['Bayelsa State', 'Rivers State', 'Delta', 'Akwa Ibom State'] },
    except: { near: [{ name: 'Port Harcourt', lat: 4.82, lon: 7.03, km: 20 }] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'red',
    label: "Adamawa au nord de la Bénoué (approx. par cercles)",
    match: { near: [
      { name: 'Mubi', lat: 10.27, lon: 13.27, km: 60 },
      { name: 'Gombi', lat: 10.17, lon: 12.74, km: 35 },
      { name: 'Song', lat: 9.83, lon: 12.63, km: 30 },
      { name: 'Guyuk', lat: 9.90, lon: 11.94, km: 30 }
    ] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'red',
    label: "Zone frontalière avec le Niger",
    match: { borderKm: 50, with: 'NE' },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'red',
    label: "Zone frontalière avec le Bénin (hors Ogun et Lagos)",
    match: { borderKm: 30, with: 'BJ' },
    except: { regions: ['Ogun State', 'Lagos'] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'red',
    label: "Zone frontalière avec le Cameroun",
    match: { borderKm: 50, with: 'CM' },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'red',
    label: "Ouest de l'État de Niger, nord et ouest du Kwara (approx. par cercles)",
    match: { near: [
      { name: 'New Bussa / Kainji', lat: 9.88, lon: 4.52, km: 70 },
      { name: 'Niger State nord-ouest', lat: 10.90, lon: 4.90, km: 60 },
      { name: 'Kaiama', lat: 9.61, lon: 3.94, km: 60 },
      { name: 'Okuta (Baruten)', lat: 9.22, lon: 3.18, km: 40 }
    ] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'red',
    label: "Nord-ouest de l'État d'Oyo, dont le parc national d'Old Oyo (approx. par cercles)",
    match: { near: [
      { name: 'Parc national d\'Old Oyo', lat: 8.62, lon: 4.14, km: 50 },
      { name: 'Saki', lat: 8.67, lon: 3.39, km: 40 }
    ] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'orange',
    label: "Villes de Kano, Kaduna et Port Harcourt",
    match: { near: [
      { name: 'Kano', lat: 12.00, lon: 8.52, km: 20 },
      { name: 'Kaduna', lat: 10.52, lon: 7.44, km: 20 },
      { name: 'Port Harcourt', lat: 4.82, lon: 7.03, km: 20 }
    ] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'orange',
    label: "Middle Belt : Benue, Nasarawa, Kogi, Plateau, Taraba, est du Niger, sud et est du Kwara, Adamawa au sud de la Bénoué",
    match: { regions: ['Benue State', 'Nasarawa State', 'Kogi State', 'Plateau State', 'Taraba State', 'Niger State', 'Kwara State', 'Adamawa'] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'orange',
    label: "Sud : États d'Ekiti, Ondo, Edo, Enugu, Anambra, Imo, Abia, Ebonyi et Cross River",
    match: { regions: ['Ekiti State', 'Ondo State', 'Edo State', 'Enugu State', 'Anambra', 'Imo State', 'Abia State', 'Ebonyi State', 'Cross River State'] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'orange',
    label: "Territoire de la capitale fédérale (FCT), sauf la ville d'Abuja",
    match: { regions: ['FCT'] },
    except: { near: [{ name: 'Abuja', lat: 9.06, lon: 7.49, km: 20 }] },
    source: src('nigeria'), date: D
  },
  {
    country: 'NG', level: 'orange',
    label: "Sud-Ouest : États d'Ogun, Osun et Oyo (sauf Ibadan et Abeokuta)",
    match: { regions: ['Ogun State', 'Osun State', 'Oyo State'] },
    except: { near: [
      { name: 'Ibadan', lat: 7.38, lon: 3.93, km: 20 },
      { name: 'Abeokuta', lat: 7.16, lon: 3.35, km: 12 }
    ] },
    source: src('nigeria'), date: D
  },
];
