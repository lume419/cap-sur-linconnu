// SERVICE D'EXPORT PDF (17e audit du 20/09/2026) : confie la mise en page à un fil de travail persistant
// (lib/pdf-worker.js) et retombe sur le processus principal si ce fil manque à l'appel.
//
// POURQUOI UN FIL PERSISTANT plutôt qu'un par export : le fil lit et préchauffe les 24 polices au démarrage (~1,6 s,
// ~140 Mo). Un fil par export paierait ce prix à chaque fois. Un seul fil suffit, la route n'autorisant de toute
// façon qu'un export à la fois (pdfExportSlot dans server.js).
//
// CE QUI EST GARANTI ICI :
//   - le processus principal n'est jamais bloqué par la mise en page (c'était tout l'intérêt de l'opération) ;
//   - un export aboutit MÊME si le fil est mort, absent ou trop lent : repli dans le processus principal, qui lit
//     alors les polices à son tour (dégradé mais correct) ;
//   - le temps de calcul du FIL est rendu à l'appelant, pour qu'il reste imputé au quota de l'adresse demandeuse —
//     sans quoi déporter le calcul aurait vidé la protection anti-abus de sa substance ;
//   - un seul export à la fois, les autres attendent leur tour (file) ;
//   - `stop()` arrête le fil : aucun fil ne doit survivre à l'arrêt du serveur ni à la fin des tests.
'use strict';
const path = require('path');
const { Worker } = require('worker_threads');

const FICHIER = path.join(__dirname, 'pdf-worker.js');
// Au-delà, le fil est considéré perdu (boucle infinie dans une police exotique, fil tué par l'hébergeur…) : il est
// terminé et l'export repart en repli. Large devant le budget de mise en page, qui s'arrête bien avant de lui-même.
const REPONSE_MAX_MS = 30000;
const REDEMARRAGE_MS = 5000;   // délai avant de retenter un fil qui vient de mourir

let fil = null;               // Worker en cours, ou null
let prêt = false;             // le fil a annoncé ses polices chargées
let fontsError = null;        // erreur de polices rapportée par le fil
let démarrage = null;         // promesse de démarrage en cours
let prochainId = 1;
const enCours = new Map();    // id -> { resolve, reject, minuteur }
let arrêté = false;           // stop() demandé : ne plus redémarrer
let dernierÉchec = 0;
let gras = null;              // points de code à variante grasse, envoyés par le fil (voir hasBoldVariant)
let statut = 'non démarré';

function nettoyer(err){
  const morts = [...enCours.values()];
  enCours.clear();
  morts.forEach(function(j){ clearTimeout(j.minuteur); j.reject(err); });
}

function démarrer(){
  if(arrêté || fil) return démarrage || Promise.resolve();
  if(Date.now() - dernierÉchec < REDEMARRAGE_MS) return Promise.resolve(); // on ne relance pas en boucle
  const w = new Worker(FICHIER);
  fil = w;
  prêt = false;
  statut = 'démarrage';
  démarrage = new Promise(function(resolve){
    w.on('message', function(msg){
      if(!msg) return;
      if(msg.type === 'ready'){
        prêt = !msg.fontsError;
        fontsError = msg.fontsError || null;
        if(Array.isArray(msg.boldCodePoints) && msg.boldCodePoints.length) gras = new Set(msg.boldCodePoints);
        if(!enCours.size) w.unref(); // au repos, le fil n'empêche pas le processus de s'arrêter ; il est repris (ref) le temps d'un export
        statut = prêt ? 'prêt (polices en ' + Math.round(msg.ms / 100) / 10 + ' s)' : 'polices indisponibles (' + msg.fontsError + ')';
        resolve();
        return;
      }
      if(msg.type === 'done'){
        const j = enCours.get(msg.id);
        if(!j) return;
        enCours.delete(msg.id);
        clearTimeout(j.minuteur);
        if(!enCours.size && fil) fil.unref();
        j.resolve({ pdf: msg.pdf ? Buffer.from(msg.pdf) : null, ms: msg.ms, erreur: msg.erreur, source: 'fil' });
      }
    });
    w.on('error', function(err){
      console.warn('[pdf] fil de travail en erreur :', (err && err.message) || 'erreur');
      statut = 'erreur (' + ((err && err.code) || 'erreur') + ')';
      fil = null; prêt = false; dernierÉchec = Date.now();
      nettoyer(err instanceof Error ? err : new Error('fil en erreur'));
      resolve();
    });
    w.on('exit', function(code){
      if(fil === w){ fil = null; prêt = false; dernierÉchec = Date.now(); statut = 'arrêté (code ' + code + ')'; }
      nettoyer(new Error('fil arrêté (code ' + code + ')'));
      resolve();
    });
  });
  return démarrage;
}

// Mise en page DANS le processus principal : repli, et seul chemin quand le fil est indisponible. Charge les polices
// à son tour (~1,6 s la première fois) plutôt que de refuser l'export.
function localement(travail){
  const PDFDocument = require('pdfkit');
  const PdfText = require('./pdf-text.js');
  const { buildTripPdf } = require('./trip-pdf.js');
  const début = process.hrtime.bigint();
  return new Promise(function(resolve, reject){
    let doc;
    try {
      doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 55, right: 55 },
        info: { Title: travail.title },
        lang: travail.lang
      });
      PdfText.registerFonts(doc);
    } catch(err){ return reject(err); }
    const chunks = [];
    let erreur = null;
    doc.on('data', function(c){ chunks.push(c); });
    doc.on('end', function(){
      PdfText.trimGlyphCaches(travail.glyphMax);
      resolve({ pdf: Buffer.concat(chunks), ms: Number(process.hrtime.bigint() - début) / 1e6, erreur: erreur, source: 'local' });
    });
    try { buildTripPdf(doc, travail.trip); } catch(err){ erreur = err; }
    try { doc.end(); } catch(err){ reject(err); }
  });
}

// Rend { pdf, ms, erreur, source }. `ms` est le temps de CALCUL réellement dépensé (dans le fil ou ici) : l'appelant
// l'impute au quota de l'adresse demandeuse.
async function build(travail){
  if(!arrêté && !fil) await démarrer();
  if(!arrêté && fil && !prêt && démarrage) await démarrage;
  if(fil && prêt){
    const id = prochainId++;
    try {
      return await new Promise(function(resolve, reject){
        const minuteur = setTimeout(function(){
          enCours.delete(id);
          const w = fil;
          if(w){ fil = null; prêt = false; dernierÉchec = Date.now(); statut = 'sans réponse : fil terminé'; w.terminate(); }
          reject(new Error('fil sans réponse'));
        }, REPONSE_MAX_MS);
        minuteur.unref();
        enCours.set(id, { resolve, reject, minuteur });
        fil.ref(); // un export en cours retient le processus ; au repos, le fil ne l'empêche pas de s'arrêter
        fil.postMessage({ type: 'build', id: id, trip: travail.trip, title: travail.title, lang: travail.lang, glyphMax: travail.glyphMax });
      });
    } catch(err){
      console.warn('[pdf] repli dans le processus principal :', (err && err.message) || 'erreur');
    }
  }
  return localement(travail);
}

function stop(){
  arrêté = true;
  const w = fil;
  fil = null; prêt = false;
  nettoyer(new Error('service arrêté'));
  return w ? w.terminate() : Promise.resolve();
}

// Caractère que la police à variante GRASSE sait dessiner (voir PDF_MAX_DISTINCT_CHARS dans server.js). Répondu
// depuis la liste envoyée par le fil ; sans fil (repli), on interroge les polices, quitte à les charger.
function hasBoldVariant(ch){
  const cp = String(ch).codePointAt(0);
  if(cp === undefined) return false;
  if(gras) return gras.has(cp);
  return require('./pdf-text.js').hasBoldVariant(ch);
}

// État pour /api/status et pour la route (503 quand les polices manquent des DEUX côtés).
function status(){ return { statut: statut, prêt: prêt, fontsError: fontsError }; }

module.exports = { démarrer, build, stop, status, hasBoldVariant };
