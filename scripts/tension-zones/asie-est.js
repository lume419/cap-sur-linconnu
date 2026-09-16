// Zones rouge/orange France Diplomatie — groupe Asie de l'Est (consultation 16/09/2026)
// Chine (dont Hong Kong et Macao, traités dans la fiche Chine), Mongolie, Taïwan : aucune zone rouge/orange.
const FD = 'https://www.diplomatie.gouv.fr/fr/information-par-pays/';

module.exports = [
  // ---------------- CORÉE DU NORD ----------------
  {
    country: 'KP', level: 'red',
    label: "Tout le pays",
    match: { all: true },
    source: FD + 'coree-du-nord/conseils-aux-voyageurs-securite', date: '2026-03-05'
  },

  // ---------------- CORÉE DU SUD ----------------
  {
    country: 'KR', level: 'orange',
    label: "Zone démilitarisée (DMZ) et abords de la frontière avec la Corée du Nord (approx. 10 km)",
    match: { borderKm: 10, with: 'KP' },
    source: FD + 'coree-du-sud/conseils-aux-voyageurs-securite', date: '2026-03-05'
  },

  // ---------------- JAPON ----------------
  {
    country: 'JP', level: 'red',
    label: "Zone interdite autour de la centrale nucléaire de Fukushima-1 (approx. 10 km)",
    match: { near: [{ name: 'Centrale Fukushima Daiichi', lat: 37.4214, lon: 141.0325, km: 10 }] },
    source: FD + 'japon/conseils-aux-voyageurs-securite', date: '2026-03-09'
  },
];
