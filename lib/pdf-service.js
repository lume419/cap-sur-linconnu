// SERVICE D'EXPORT PDF (17e audit du 20/09/2026, refondu au 18e le 21/09/2026) : confie la mise en page à un fil de
// travail persistant (lib/pdf-worker.js) et retombe sur le processus principal si ce fil manque à l'appel.
//
// POURQUOI UN FIL PERSISTANT plutôt qu'un par export : le fil lit et préchauffe les 24 polices au démarrage (~1,6 s,
// ~140 Mo). Un fil par export paierait ce prix à chaque fois.
//
// POURQUOI UNE FILE — et c'est la leçon du 18e audit. La première version postait au fil sans file ni contre-pression,
// en comptant sur `pdfExportSlot` (server.js) pour n'autoriser qu'un export à la fois. Or ce créneau est rendu dès que
// la CONNEXION se ferme : un client qui coupe la sienne juste après l'envoi le libère alors que la mise en page
// continue. Tant que la mise en page était synchrone dans le processus, c'était sans conséquence — rien d'autre ne
// pouvait démarrer pendant ce temps. Le fil a supprimé cette sérialisation implicite sans la remplacer. Mesuré :
// 200 exports abandonnés en 3 s depuis 200 adresses (chacune sous son quota) empilaient 200 travaux dans le fil ; au
// premier dépassement du délai de réponse, TOUS les travaux en vol étaient rejetés d'un coup et repartaient en mise
// en page synchrone dans le processus principal — 69 d'affilée, boucle d'événements figée 39 secondes.
//
// CE QUI EST GARANTI ICI (et vérifié par tests/server.test.js) :
//   - UNE SEULE mise en page à la fois, dans le fil comme en repli : les autres attendent dans une file BORNÉE, et
//     au-delà le service refuse tout de suite (« busy ») plutôt que d'accepter un travail qu'il ne tiendra pas ;
//   - un travail dont le demandeur est PARTI est abandonné avant de coûter la moindre milliseconde de mise en page ;
//   - la mort ou l'expiration du fil ne concerne QUE le travail en cours : les travaux en attente sont repris par le
//     fil suivant, jamais déversés en masse dans le processus principal. Le 19e audit du 21/09/2026 a montré que
//     cette garantie était FAUSSE : `dernierÉchec` interdit de relancer un fil pendant REDEMARRAGE_MS, et défiler()
//     retombait alors sur le repli pour CHAQUE travail de la file — 5 mises en page synchrones d'affilée, page
//     d'accueil à 3 101 ms au lieu de 13 ms. Pendant le délai de garde, la file ATTEND désormais (planifierReprise),
//     et le repli reste réservé au travail que le fil a lâché en vol, ou au cas où le fil refuse de démarrer ;
//   - le délai de réponse court à partir du moment où le travail est ENVOYÉ au fil, pas de son arrivée dans la file :
//     un travail ne meurt pas de l'attente des autres ;
//   - le temps de calcul dépensé est rendu à l'appelant DANS TOUS LES CAS, y compris quand le fil expire ou meurt,
//     pour qu'il reste imputé au quota de l'adresse demandeuse — sans quoi déporter le travail l'aurait rendu gratuit.
//     Il est rendu en DEUX parts (19e audit du 21/09/2026) : `ms` = ce que l'export a coûté à l'adresse demandeuse,
//     `msProcessus` = ce qu'il a coûté au PROCESSUS, c'est-à-dire la seule part qui a bloqué la boucle d'événements.
//     L'attente d'un fil qui ne répond plus est du temps d'HORLOGE, pas du calcul : la compter dans le budget global
//     revenait à retirer 15 s sur 25 s par minute à tout le site pour un seul export malchanceux. Elle est en outre
//     plafonnée au budget de mise en page du fil (PDF_BUILD_BUDGET_MS), au-delà duquel le fil ne calculait plus rien ;
//   - `stop()` arrête le fil : aucun fil ne survit à l'arrêt du serveur ni à la fin des tests.
'use strict';
const path = require('path');
const { Worker } = require('worker_threads');

const FICHIER = path.join(__dirname, 'pdf-worker.js');
// Valeur d'environnement bornée, sinon le défaut : une variable absurde ne doit pas affaiblir le service.
function borneEnv(nom, défaut, min, max){
  const v = parseInt(process.env[nom], 10);
  return (isFinite(v) && v >= min && v <= max) ? v : défaut;
}
// Délai de réponse d'un travail EFFECTIVEMENT ENVOYÉ au fil. Large devant le budget de mise en page
// (PDF_BUILD_BUDGET_MS = 3,5 s, qui s'arrête de lui-même) : ne se déclenche que si le fil est réellement perdu.
// Réglable par l'environnement UNIQUEMENT pour les tests : c'est le seul moyen d'éprouver les chemins de perte du
// fil (expiration, mort en cours de travail) sans attendre 15 s ni tuer le fil de l'extérieur — et le 18e audit a
// montré que ces chemins, jamais exercés, étaient précisément ceux qui contenaient la faille.
const REPONSE_MAX_MS = borneEnv('PDF_REPONSE_MAX_MS', 15000, 50, 120000);
// File d'attente : au-delà, « busy ». Un export coûte 0,1 à 3,1 s ; quatre en attente, c'est déjà plus que ce qu'un
// visiteur accepte d'attendre, et la route a de toute façon son propre créneau et ses quotas par adresse.
const FILE_MAX = borneEnv('PDF_FILE_MAX', 4, 1, 64);
// Délai avant de retenter un fil qui vient de mourir. Réglable par l'environnement UNIQUEMENT pour les tests,
// comme REPONSE_MAX_MS et pour la même raison : sans cela, éprouver le comportement de la file pendant le délai de
// garde coûte cinq secondes par travail (19e audit du 21/09/2026).
const REDEMARRAGE_MS = borneEnv('PDF_REDEMARRAGE_MS', 5000, 50, 60000);
// Au-delà de ce temps, un fil qui n'a pas rendu son document ne calculait plus : le reste est de l'attente, pas du
// travail, et n'est imputé à personne. Même valeur que le budget de mise en page du fil (lib/trip-pdf.js).
const FIL_CALCUL_MAX_MS = 3500;

let fil = null;               // Worker en cours, ou null
let prêt = false;             // le fil a annoncé ses polices chargées
let fontsError = null;        // erreur de polices rapportée par le fil
let démarrage = null;         // promesse de démarrage en cours
let gras = null;              // points de code à variante grasse, envoyés par le fil (voir hasBoldVariant)
let statut = 'non démarré';
let arrêté = false;           // stop() demandé : ne plus redémarrer
let dernierÉchec = 0;
let reprise = null;            // minuteur de reprise de la file après un échec de fil (voir planifierReprise)

const file = [];              // travaux en attente : { travail, abandonné, resolve, reject }
let enVol = null;             // travail envoyé au fil : { …, id, minuteur, envoyéÀ }
let prochainId = 1;
let occupé = false;           // une mise en page est en cours (fil OU repli) : rien d'autre ne démarre

function erreurOccupé(){ const e = new Error('service d\'export saturé'); e.busy = true; return e; }

// Erreur réduite à son TYPE et à son code (13e audit du 19/09/2026) : un message d'erreur peut reprendre un extrait
// des données traitées, que la politique de confidentialité promet de ne jamais journaliser.
function kindOf(err){
  const name = err && typeof err.name === 'string' && /^[A-Za-z]{1,40}$/.test(err.name) ? err.name : 'Error';
  const code = err && typeof err.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(err.code) ? err.code : '';
  return name + (code ? ' (' + code + ')' : '');
}

// ------------------------------------------------------------------------------------------------------- le fil
function démarrer(){
  if(arrêté) return Promise.resolve();
  if(fil) return démarrage || Promise.resolve();
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
        if(!enVol) w.unref(); // au repos, le fil n'empêche pas le processus de s'arrêter ; repris le temps d'un export
        statut = prêt ? 'prêt (polices en ' + Math.round(msg.ms / 100) / 10 + ' s)' : 'polices indisponibles (' + msg.fontsError + ')';
        resolve();
        défiler();
        return;
      }
      if(msg.type === 'done' && enVol && enVol.id === msg.id){
        const j = enVol;
        enVol = null;
        clearTimeout(j.minuteur);
        if(fil) fil.unref();
        terminer(j, { pdf: msg.pdf ? Buffer.from(msg.pdf) : null, ms: msg.ms, msProcessus: 0, erreur: msg.erreur, source: 'fil' });
      }
    });
    w.on('error', function(err){
      console.warn('[pdf] fil de travail en erreur :', kindOf(err));
      statut = 'erreur (' + kindOf(err) + ')';
      perdreLeFil(w, err);
      resolve();
    });
    w.on('exit', function(code){
      if(fil === w) statut = 'arrêté (code ' + code + ')';
      perdreLeFil(w, new Error('fil arrêté (code ' + code + ')'));
      resolve();
    });
  });
  return démarrage;
}

// Le fil est perdu : SEUL le travail en vol en pâtit (il repart en repli). La file, elle, attend le fil suivant —
// c'est ce qui empêche une expiration de déverser des dizaines de mises en page dans le processus principal.
function perdreLeFil(w, err){
  if(fil === w){ fil = null; prêt = false; dernierÉchec = Date.now(); }
  const j = enVol;
  if(!j){ défiler(); return; }
  enVol = null;
  clearTimeout(j.minuteur);
  // Temps de fil imputable : borné par FIL_CALCUL_MAX_MS (19e audit du 21/09/2026). Au-delà, le fil n'était plus en
  // train de calculer notre document — il était perdu, et cette attente n'est du calcul pour personne.
  const déjàDépensé = Math.min(Date.now() - j.envoyéÀ, FIL_CALCUL_MAX_MS);
  console.warn('[pdf] repli dans le processus principal :', kindOf(err));
  repli(j, déjàDépensé);
}

// -------------------------------------------------------------------------------------- mise en page en repli
// Dans le processus principal : dégradé (elle bloque la boucle d'événements le temps du calcul), donc réservée au
// travail que le fil n'a pas pu faire, un seul à la fois. `déjàDépensé` : le temps brûlé dans le fil avant sa perte,
// rendu à l'appelant avec le reste pour rester imputé au quota de l'adresse demandeuse.
function repli(j, déjàDépensé){
  const PDFDocument = require('pdfkit');
  const PdfText = require('./pdf-text.js');
  const { buildTripPdf } = require('./trip-pdf.js');
  const début = process.hrtime.bigint();
  // msProcessus : ce que CE processus a réellement passé, boucle d'événements bloquée — la seule part qui doit peser
  // sur le budget global du site. ms : le total imputé à l'adresse demandeuse (fil compris, plafonné en amont).
  const msProcessus = function(){ return Number(process.hrtime.bigint() - début) / 1e6; };
  const ms = function(){ return msProcessus() + (déjàDépensé || 0); };
  let doc;
  try {
    doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 55, right: 55 },
      info: { Title: j.travail.title },
      lang: j.travail.lang
    });
    PdfText.registerFonts(doc);
  } catch(err){ return terminer(j, null, err, ms(), msProcessus()); }
  const chunks = [];
  let erreur = null;
  let fini = false;
  doc.on('data', function(c){ chunks.push(c); });
  doc.on('end', function(){
    if(fini) return;
    fini = true;
    PdfText.trimGlyphCaches(j.travail.glyphMax);
    terminer(j, { pdf: Buffer.concat(chunks), ms: ms(), msProcessus: msProcessus(), erreur: erreur, source: 'local' });
  });
  try { buildTripPdf(doc, j.travail.trip); } catch(err){ erreur = kindOf(err); }
  try { doc.end(); } catch(err){ if(!fini){ fini = true; terminer(j, null, err, ms(), msProcessus()); } }
}

// --------------------------------------------------------------------------------------------------- la file
function terminer(j, résultat, err, ms, msProcessus){
  occupé = false;
  if(résultat) j.resolve(résultat);
  else j.reject(Object.assign(err || new Error('échec de la mise en page'), { msDépensé: ms || 0, msProcessus: msProcessus || 0 }));
  défiler();
}

// Fil perdu : la file ATTEND la fin du délai de garde plutôt que de se déverser dans le processus principal
// (19e audit du 21/09/2026). Un seul minuteur, non bloquant, libéré par stop().
function planifierReprise(){
  if(reprise || arrêté) return;
  const attente = Math.max(10, REDEMARRAGE_MS - (Date.now() - dernierÉchec));
  reprise = setTimeout(function(){ reprise = null; défiler(); }, attente);
  if(reprise.unref) reprise.unref();
}

function défiler(){
  if(occupé || arrêté) return;
  // Travaux dont le demandeur est parti : abandonnés sans rien calculer. C'est ce qui rend l'empilement d'exports
  // abandonnés inoffensif.
  while(file.length && file[0].abandonné && file[0].abandonné()){
    const mort = file.shift();
    mort.resolve({ pdf: null, ms: 0, erreur: null, source: 'abandonné', abandonné: true });
  }
  if(!file.length) return;
  // Relance au passage, si le délai de garde le permet. new Worker() peut lever en SYNCHRONE (EAGAIN,
  // ERR_WORKER_INIT_FAILED, fichier illisible) : sans ce garde-fou, l'exception traversait défiler() depuis le
  // gestionnaire « message » du fil et devenait une exception non rattrapée, donc un arrêt du processus.
  if(!fil){ try { démarrer(); } catch(err){ console.warn('[pdf] fil impossible à démarrer :', kindOf(err)); dernierÉchec = Date.now(); } }
  if(fil && !prêt) return;  // le fil chauffe : la file l'attend (elle sera reprise au signal « ready »)
  // Pas de fil ET délai de garde en cours : la file ATTEND. C'est ici que la 18e passe déversait tout le contenu de
  // la file dans le processus principal, une mise en page synchrone après l'autre (19e audit du 21/09/2026).
  if(!fil && Date.now() - dernierÉchec < REDEMARRAGE_MS){ planifierReprise(); return; }
  const j = file.shift();
  occupé = true;
  if(fil && prêt){
    j.id = prochainId++;
    j.envoyéÀ = Date.now();
    enVol = j;
    j.minuteur = setTimeout(function(){
      if(enVol !== j) return;
      const w = fil;
      statut = 'sans réponse : fil terminé';
      if(w){ fil = null; prêt = false; dernierÉchec = Date.now(); w.terminate(); }
      perdreLeFil(w, new Error('fil sans réponse'));
    }, REPONSE_MAX_MS);
    j.minuteur.unref();
    fil.ref(); // un export en cours retient le processus ; au repos, le fil ne l'empêche pas de s'arrêter
    fil.postMessage({ type: 'build', id: j.id, trip: j.travail.trip, title: j.travail.title,
      lang: j.travail.lang, glyphMax: j.travail.glyphMax });
  } else {
    repli(j, 0); // aucun fil disponible : mise en page ici, une seule à la fois
  }
}

// Rend { pdf, ms, erreur, source } ; `source: 'abandonné'` quand le demandeur est parti avant le calcul. `ms` est le
// temps de CALCUL réellement dépensé (fil et repli additionnés) : l'appelant l'impute au quota de l'adresse.
// `abandonné` : fonction rendant true quand la réponse n'a plus de destinataire (connexion coupée).
// Rejet avec `err.busy` quand la file est pleine, et `err.msDépensé` quand du calcul a déjà été consommé.
function build(travail, abandonné){
  if(arrêté) return Promise.reject(erreurOccupé());
  if(file.length >= FILE_MAX) return Promise.reject(erreurOccupé());
  if(!fil) démarrer();
  return new Promise(function(resolve, reject){
    file.push({ travail: travail, abandonné: abandonné || null, resolve: resolve, reject: reject });
    défiler();
  });
}

function stop(){
  if(reprise){ clearTimeout(reprise); reprise = null; }
  arrêté = true;
  const w = fil;
  fil = null; prêt = false; occupé = false;
  const morts = file.splice(0, file.length);
  if(enVol){ clearTimeout(enVol.minuteur); morts.push(enVol); enVol = null; }
  morts.forEach(function(j){ j.reject(erreurOccupé()); });
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

// État VIVANT, pour /api/status et pour la route (503 quand les polices manquent des deux côtés). `statut` suit le
// fil en temps réel : au 18e audit, /api/status annonçait encore « polices prêtes » pendant que le fil était mort.
function status(){
  return { statut: statut, prêt: prêt, fontsError: fontsError, enAttente: file.length, enCours: !!enVol };
}

module.exports = { démarrer, build, stop, status, hasBoldVariant };
