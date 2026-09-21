// Sonde de lib/pdf-service.js avec un FIL DE TRAVAIL VOLONTAIREMENT DÉFAILLANT (20e audit du 21/09/2026).
// Lancée dans un processus à part par tests/server.test.js : le service garde un état global (fil, file, compteur
// d'échecs) qu'on ne peut pas remettre à neuf dans le processus de test.
// Argument : « mort » (le fil s'arrête aussitôt chargé) ou « muet » (le fil vit mais n'annonce jamais ses polices).
// Écrit UNE ligne JSON sur la sortie standard : { source, taille, ms } si un document sort, { silence: true } si le
// service ne répond rien avant la limite, { erreur } s'il rejette.
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const mode = process.argv[2] === 'muet' ? 'muet' : 'mort';
process.env.PDF_FIL_CASSE = mode;
process.env.PDF_REDEMARRAGE_MS = '200';   // délai de garde raccourci : sinon 5 s par tentative
process.env.PDF_DEMARRAGE_MAX_MS = '300'; // délai d'annonce des polices raccourci : sinon 15 s par tentative

const svc = require(path.join(ROOT, 'lib', 'pdf-service.js'));
const travail = {
  trip: { start: { name: 'Paris', region: 'Île-de-France', lat: 48.8566, lon: 2.3522, country: 'FR' }, steps: [], lang: 'fr', t: {}, labels: {} },
  title: 'sonde', lang: 'fr', glyphMax: 4000
};

const LIMITE_MS = Number(process.env.PDF_SONDE_LIMITE_MS) || 20000;
const t0 = Date.now();
let fini = false;
function dire(o){
  if(fini) return;
  fini = true;
  process.stdout.write(JSON.stringify(Object.assign({ mode: mode, ms: Date.now() - t0 }, o)) + '\n');
  try { svc.stop(); } catch(e){}
  setTimeout(function(){ process.exit(0); }, 50).unref();
}
// Minuteur volontairement RÉFÉRENCÉ : sans lui, le processus s'arrêterait avant d'avoir constaté le silence — c'est
// exactement ce que faisait le service avant la correction, et ce silence doit être observable.
setTimeout(function(){ dire({ silence: true, statut: svc.status().statut }); }, LIMITE_MS);

svc.build(travail, null)
  .then(function(r){ dire({ source: r.source, taille: r.pdf ? r.pdf.length : 0, statut: svc.status().statut }); })
  .catch(function(e){ dire({ erreur: String(e && e.message), statut: svc.status().statut }); });
