// FIL DE TRAVAIL DE L'EXPORT PDF (17e audit du 20/09/2026) — exécuté par lib/pdf-service.js, jamais directement.
//
// POURQUOI : la mise en page d'un PDF est entièrement SYNCHRONE (pdfkit, doc.end() compris) et coûte de 0,1 à 3,1 s
// selon l'écriture. Tant qu'elle tournait dans le processus qui répond aux requêtes, le site entier cessait de
// répondre pendant ce temps — recherche de ville, tirage, photos, tout. Ici, elle tourne dans un fil séparé : le
// processus principal garde sa boucle d'événements libre.
//
// Ce fil charge ses PROPRES polices (~140 Mo une fois les tables OpenType analysées) et les préchauffe une fois au
// démarrage (~1,6 s) : sans cela, le premier export les paierait. Elles ne sont donc plus chargées dans le processus
// principal, qui ne les lit qu'en repli (voir lib/pdf-service.js) — la mémoire n'est pas payée deux fois en régime
// normal.
//
// Le fil ne connaît ni Express, ni les requêtes, ni les quotas : il reçoit un objet de voyage DÉJÀ VALIDÉ par la
// route (profondeur, nombre d'étapes, caractères distincts, chaînes) et rend les octets du document.
'use strict';
const { parentPort } = require('worker_threads');
const PDFDocument = require('pdfkit');
const PdfText = require('./pdf-text.js');
const { buildTripPdf } = require('./trip-pdf.js');

// Erreur réduite à son TYPE et à son code, comme dans server.js (13e audit du 19/09/2026) : un message d'erreur peut
// reprendre un extrait des données traitées, que la politique de confidentialité promet de ne jamais journaliser.
function kindOf(err){
  const name = err && typeof err.name === 'string' && /^[A-Za-z]{1,40}$/.test(err.name) ? err.name : 'Error';
  const code = err && typeof err.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(err.code) ? err.code : '';
  return name + (code ? ' (' + code + ')' : '');
}

// Polices lues et préchauffées avant d'annoncer le fil prêt : la route ne lui enverra rien tant qu'il ne l'est pas.
let fontsError = null;
const t0 = Date.now();
try { PdfText.warmUp(); } catch(err){ fontsError = kindOf(err); }
// Les points de code à variante grasse partent avec le signal « prêt » : le processus principal en a besoin pour
// compter les caractères distincts d'un export (server.js, distinctChars) sans charger les polices lui-même.
let boldCodePoints = [];
try { boldCodePoints = PdfText.boldCodePoints(); } catch(err){ /* polices indisponibles : déjà signalé ci-dessus */ }
parentPort.postMessage({ type: 'ready', fontsError: fontsError, ms: Date.now() - t0, boldCodePoints: boldCodePoints });

parentPort.on('message', function(msg){
  if(!msg || msg.type !== 'build') return;
  const début = performance.now();
  const chunks = [];
  let erreur = null;
  const rendre = function(){
    const pdf = Buffer.concat(chunks);
    // Transfert du tampon plutôt que copie : le processus principal le reçoit sans le recopier.
    const brut = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);
    parentPort.postMessage({ type: 'done', id: msg.id, pdf: brut, ms: performance.now() - début, erreur: erreur }, [brut]);
  };
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 55, right: 55 },
      info: { Title: msg.title },
      lang: msg.lang
    });
    PdfText.registerFonts(doc);
    doc.on('data', function(c){ chunks.push(c); });
    doc.on('end', function(){
      PdfText.trimGlyphCaches(msg.glyphMax);
      rendre();
    });
    // Mise en page : une erreur ici laisse le document utilisable (pages déjà écrites), comme dans la route d'origine.
    try { buildTripPdf(doc, msg.trip); } catch(err){ erreur = kindOf(err); }
    doc.end();
  } catch(err){
    // Échec avant même d'avoir un document : rien à rendre, la route basculera sur le repli.
    erreur = kindOf(err);
    parentPort.postMessage({ type: 'done', id: msg.id, pdf: null, ms: performance.now() - début, erreur: erreur });
  }
});
