// Zones rouge/orange France Diplomatie — groupe MENA (consultation 16/09/2026)
const FD = 'https://www.diplomatie.gouv.fr/fr/information-par-pays/';
const D = '2026-09-15'; // « Date de mise à jour le : 15 septembre 2026 » affichée sur les fiches

module.exports = [
  // ---------------- SYRIE ----------------
  {
    country: 'SY', level: 'red',
    label: "Tout le pays",
    match: { all: true },
    source: FD + 'syrie/conseils-aux-voyageurs-securite', date: D
  },

  // ---------------- LIBAN ----------------
  // Rouge : Nord au-delà de la route Abdeh–Mechmech (Akkar), Béqaa (Baalbek, Anjar), Sud (axe Saïda exclue–Jezzine–Machghara et au-delà), camps palestiniens.
  // Orange : centre du pays de Tripoli à Saïda (Beyrouth, Mont-Liban, Liban-Nord hors Akkar), Saïda incluse.
  {
    country: 'LB', level: 'red',
    label: "Akkar (nord de la route Abdeh–Mechmech), plaine de la Béqaa (Baalbek, Anjar, Zahlé), Nabatieh",
    match: { all: true },
    except: { cpPrefix: ['LB-BA', 'LB-JL', 'LB-AS', 'LB-JA'] },
    source: FD + 'liban/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'LB', level: 'red',
    label: "Sud-Liban au sud de Saïda (axe Saïda–Jezzine–Machghara, Tyr, Naqoura)",
    match: { cpPrefix: ['LB-JA'] },
    except: { near: [{ name: 'Saïda', lat: 33.5575, lon: 35.3715, km: 3 }] },
    source: FD + 'liban/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'LB', level: 'orange',
    label: "Centre du pays de Tripoli à Saïda (Beyrouth, Mont-Liban, Liban-Nord)",
    match: { cpPrefix: ['LB-BA', 'LB-JL', 'LB-AS'] },
    source: FD + 'liban/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'LB', level: 'orange',
    label: "Ville de Saïda",
    match: { near: [{ name: 'Saïda', lat: 33.5575, lon: 35.3715, km: 3 }] },
    source: FD + 'liban/conseils-aux-voyageurs-securite', date: D
  },

  // ---------------- ISRAËL ----------------
  {
    country: 'IL', level: 'orange',
    label: "Israël (ensemble du pays)",
    match: { all: true },
    source: FD + 'israel-palestine/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'IL', level: 'red',
    label: "Frontière avec le Liban",
    match: { borderKm: 8, with: 'LB' },
    source: FD + 'israel-palestine/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'IL', level: 'red',
    label: "Plateau du Golan",
    match: { near: [
      { name: 'Golan nord (Majdal Shams / Mas’ade)', lat: 33.15, lon: 35.80, km: 12 },
      { name: 'Golan sud (Katzrin / Hispin)', lat: 32.90, lon: 35.78, km: 14 }
    ] },
    source: FD + 'israel-palestine/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'IL', level: 'red',
    label: "Zone autour de la bande de Gaza",
    match: { near: [
      { name: 'Sderot', lat: 31.525, lon: 34.597, km: 7 },
      { name: 'Be’eri / Nahal Oz', lat: 31.44, lon: 34.49, km: 7 },
      { name: 'Kissufim / Nir Oz', lat: 31.33, lon: 34.40, km: 8 },
      { name: 'Kerem Shalom', lat: 31.23, lon: 34.29, km: 8 }
    ] },
    source: FD + 'israel-palestine/conseils-aux-voyageurs-securite', date: D
  },

  // ---------------- PALESTINE ----------------
  {
    country: 'PS', level: 'red',
    label: "Bande de Gaza",
    match: { cpPrefix: ['PS-GZA'] },
    source: FD + 'israel-palestine/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'PS', level: 'orange',
    label: "Cisjordanie (y compris Jérusalem-Est)",
    match: { cpPrefix: ['PS-WBK'] },
    source: FD + 'israel-palestine/conseils-aux-voyageurs-securite', date: D
  },

  // ---------------- JORDANIE ----------------
  {
    country: 'JO', level: 'red',
    label: "Frontière avec la Syrie",
    match: { borderKm: 12, with: 'SY' },
    source: FD + 'jordanie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'JO', level: 'red',
    label: "Frontière avec l'Irak (secteur Rukban / Ruwaished-Est)",
    match: { near: [{ name: 'Rukban (confins Syrie–Irak)', lat: 33.31, lon: 38.70, km: 30 }] },
    source: FD + 'jordanie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'JO', level: 'orange',
    label: "Bande de territoire aux abords de la frontière syrienne (Ramtha, Irbid…)",
    match: { borderKm: 30, with: 'SY' },
    source: FD + 'jordanie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'JO', level: 'orange',
    label: "Nord-est du pays (gouvernorat de Mafraq)",
    match: { cpPrefix: ['JO-MA'] },
    source: FD + 'jordanie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'JO', level: 'orange',
    label: "Zone frontalière avec les territoires palestiniens (vallée du Jourdain)",
    match: { borderKm: 15, with: 'PS' },
    source: FD + 'jordanie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'JO', level: 'orange',
    label: "Aqaba et ses environs ; ville de Ma'an",
    match: { near: [
      { name: 'Aqaba', lat: 29.53, lon: 35.01, km: 25 },
      { name: "Ma'an", lat: 30.196, lon: 35.734, km: 8 }
    ] },
    source: FD + 'jordanie/conseils-aux-voyageurs-securite', date: D
  },

  // ---------------- ÉGYPTE ----------------
  {
    country: 'EG', level: 'red',
    label: "Nord du Sinaï (au nord de la ligne Suez–Taba)",
    match: { cpPrefix: ['EG-SIN'] },
    source: FD + 'egypte/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'EG', level: 'red',
    label: "Désert occidental vers la frontière libyenne (Salloum)",
    match: { borderKm: 40, with: 'LY' },
    source: FD + 'egypte/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'EG', level: 'red',
    label: "Zone frontalière avec le Soudan (route au sud d'Abou Simbel)",
    match: { borderKm: 30, with: 'SD' },
    except: { near: [{ name: 'Abou Simbel', lat: 22.3457, lon: 31.6162, km: 5 }] },
    source: FD + 'egypte/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'EG', level: 'red',
    label: "Triangle de Halayeb (frontière soudanaise)",
    match: { near: [{ name: "Hala'ib", lat: 22.2227, lon: 36.6468, km: 40 }] },
    source: FD + 'egypte/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'EG', level: 'orange',
    label: "Désert à l'ouest de Marsa Matrouh (Sidi Barrani, oasis de Siwa)",
    match: { borderKm: 170, with: 'LY' },
    source: FD + 'egypte/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'EG', level: 'orange',
    label: "Oasis de Dakhla (hors triangle Le Caire–Farafra–El Kharga, approximation)",
    match: { near: [{ name: 'Mout (Dakhla)', lat: 25.4874, lon: 28.9792, km: 40 }] },
    source: FD + 'egypte/conseils-aux-voyageurs-securite', date: D
  },

  // ---------------- LIBYE ----------------
  {
    country: 'LY', level: 'red',
    label: "Tout le pays, y compris Tripoli (sauf Benghazi et Misrata)",
    match: { all: true },
    except: { near: [
      { name: 'Benghazi', lat: 32.115, lon: 20.07, km: 20 },
      { name: 'Misrata', lat: 32.375, lon: 15.09, km: 20 }
    ] },
    source: FD + 'libye/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'LY', level: 'orange',
    label: "Villes de Benghazi et Misrata",
    match: { near: [
      { name: 'Benghazi', lat: 32.115, lon: 20.07, km: 20 },
      { name: 'Misrata', lat: 32.375, lon: 15.09, km: 20 }
    ] },
    source: FD + 'libye/conseils-aux-voyageurs-securite', date: D
  },

  // ---------------- TUNISIE ----------------
  {
    country: 'TN', level: 'red',
    label: "Monts Chambi, Semmama, Selloum, Mghila et Orbata",
    match: { near: [
      { name: 'Mont Chambi', lat: 35.20, lon: 8.67, km: 8 },
      { name: 'Mont Semmama', lat: 35.31, lon: 8.93, km: 6 },
      { name: 'Mont Selloum', lat: 35.08, lon: 8.73, km: 6 },
      { name: 'Mont Mghila', lat: 35.40, lon: 9.25, km: 7 },
      { name: 'Mont Orbata', lat: 34.36, lon: 9.05, km: 7 }
    ] },
    source: FD + 'tunisie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'TN', level: 'red',
    label: "Zone militaire saharienne proche des frontières libyenne et algérienne (Dehiba, poste frontière)",
    match: { near: [{ name: 'Dehiba (frontière libyenne)', lat: 32.008, lon: 10.7013, km: 3 }] },
    source: FD + 'tunisie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'TN', level: 'orange',
    label: "Désert au sud et à l'est de la ligne Rjim Maatoug–Borj Bourguiba–Ben Guerdane (Remada, Dehiba, Ksar Ghilane)",
    match: { near: [
      { name: 'Remada', lat: 32.3166, lon: 10.3955, km: 25 },
      { name: 'Dehiba', lat: 32.008, lon: 10.7013, km: 20 },
      { name: 'Ksar Ghilane', lat: 32.9807, lon: 9.6363, km: 15 },
      { name: "Frontière Ras Jedir (est de Ben Guerdane)", lat: 33.14, lon: 11.46, km: 12 }
    ] },
    source: FD + 'tunisie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'TN', level: 'orange',
    label: "Secteur entre les monts Chambi, Semmama et Mghila, sud du mont Selloum, abords du mont Orbata",
    match: { near: [
      { name: 'Entre Chambi, Semmama et Mghila', lat: 35.28, lon: 8.95, km: 22 },
      { name: 'Sud du mont Selloum', lat: 34.98, lon: 8.72, km: 12 },
      { name: 'Abords du mont Orbata', lat: 34.36, lon: 9.05, km: 18 }
    ] },
    source: FD + 'tunisie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'TN', level: 'orange',
    label: "Moins de 5 km de la frontière algérienne (Jendouba, Le Kef)",
    match: { borderKm: 5, with: 'DZ' },
    source: FD + 'tunisie/conseils-aux-voyageurs-securite', date: D
  },

  // ---------------- ALGÉRIE ----------------
  {
    country: 'DZ', level: 'red',
    label: "Frontière tunisienne à partir et au sud de Tébessa",
    match: { borderKm: 60, with: 'TN' },
    except: { near: [{ name: 'Nord de Tébessa (Ouenza, Souk Ahras, El Tarf)', lat: 36.3, lon: 8.1, km: 95 }] },
    source: FD + 'algerie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'DZ', level: 'red',
    label: "Frontière libyenne (In Amenas)",
    match: { near: [{ name: 'In Amenas / Zarzaïtine', lat: 28.06, lon: 9.65, km: 60 }] },
    source: FD + 'algerie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'DZ', level: 'red',
    label: "Frontière marocaine",
    match: { borderKm: 20, with: 'MA' },
    source: FD + 'algerie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'DZ', level: 'orange',
    label: "Abords de la frontière marocaine",
    match: { borderKm: 35, with: 'MA' },
    source: FD + 'algerie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'DZ', level: 'orange',
    label: "Wilayas d'Aïn Defla, Batna, Sétif et de Tindouf",
    match: { regions: ['Ain-Defla', 'Batna', 'Setif', 'Tindouf'] },
    source: FD + 'algerie/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'DZ', level: 'orange',
    label: "Massif des Aurès, massif de Chréa, région de Hassi Messaoud",
    match: { near: [
      { name: 'Massif des Aurès', lat: 35.25, lon: 6.55, km: 45 },
      { name: 'Massif de Chréa', lat: 36.42, lon: 2.88, km: 12 },
      { name: 'Hassi Messaoud', lat: 31.68, lon: 6.07, km: 50 }
    ] },
    source: FD + 'algerie/conseils-aux-voyageurs-securite', date: D
  },

  // ---------------- MAROC / SAHARA OCCIDENTAL ----------------
  {
    country: 'MA', level: 'red',
    label: "Le long de la frontière avec la Mauritanie",
    match: { borderKm: 30, with: 'MR' },
    source: FD + 'maroc/conseils-aux-voyageurs-securite', date: D
  },
  {
    country: 'EH', level: 'red',
    label: "Le long de la frontière avec la Mauritanie (hors poste de Guerguerat sur la route côtière)",
    match: { borderKm: 30, with: 'MR' },
    except: { near: [{ name: 'Guerguerat', lat: 21.4271, lon: -16.9599, km: 3 }] },
    source: FD + 'maroc/conseils-aux-voyageurs-securite', date: D
  },
];
