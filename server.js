// Serveur minimal : sert le dossier public/ tel quel (HTML, CSS, JS, données).
// Toute la logique du générateur reste côté client (public/js/app.js) — ce serveur
// n'a pas d'état, pas de base de données, et ne reçoit aucune donnée du visiteur.
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public'), {
  // Les données (communes.txt, featured.txt, france-map.json) sont volumineuses mais
  // statiques : autant laisser les navigateurs les mettre en cache.
  maxAge: '1h',
  extensions: ['html']
}));

app.listen(PORT, () => {
  console.log(`Cap sur l'Inconnu — http://localhost:${PORT}`);
});
