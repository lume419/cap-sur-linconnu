// MISE EN PAGE DE L'EXPORT PDF — sortie de server.js au 17e audit du 20/09/2026, sans changer une ligne de la mise en
// page elle-même (seuls l'en-tête, les « require » et les chemins de fichiers diffèrent).
//
// POURQUOI : la mise en page est SYNCHRONE et coûte de 0,1 à 3,1 s selon l'écriture. Tant qu'elle s'exécutait dans le
// processus qui répond aux requêtes, le site entier cessait de répondre pendant ce temps — c'est la raison d'être du
// budget PDF_BUILD_BUDGET_MS, qui protégeait les AUTRES visiteurs en tronquant le document du demandeur. En module à
// part, le même code peut tourner dans un fil de travail (lib/pdf-worker.js) : le processus principal reste libre.
// Le module ne connaît ni Express, ni les requêtes, ni les quotas : il reçoit un objet de voyage déjà validé et
// dessine dans un document pdfkit. Il est donc AUTONOME — il relit lui-même data/hiking.json et public/js/i18n.js,
// que server.js lit de son côté : un fil de travail n'a pas accès aux variables du processus principal.
'use strict';
const fs = require('fs');
const path = require('path');
const PdfText = require('./pdf-text.js');
const TripData = require('../public/js/trip-data.js');
const TripDataCountries = TripData.COUNTRIES;
const TripDataTollSource = TripData.TOLL_SOURCE;
const ROOT = path.join(__dirname, '..');
// Portails de randonnée : seuls leurs hôtes servent ici (liens cliquables autorisés, voir PDF_LINK_HOSTS).
let HIKING_DATA = { visorandoCountries: ['FR'], portals: [] };
try { HIKING_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'hiking.json'), 'utf8')); } catch(err){ /* fichier absent : France seule */ }

// Liens cliquables du PDF (audit du 17/09/2026) : https seulement, vers les hôtes que l'application produit elle-même —
// un lien arbitraire envoyé par un client ferait du PDF « officiel » du site un porteur d'hameçonnage. Ensemble calculé
// une fois au démarrage : hôtes des URL de LODGING_RULES, VAN_RULES, MOTO_RULES, des vignettes (COUNTRIES) et des
// portails de randonnée (data/hiking.json), plus les familles d'hôtes ci-dessous (logement, randonnée, Wikipédia).
const PDF_LINK_HOST_PATTERNS = [
  // Airbnb : l'hôte EXACT produit par le moteur (lib/trip-engine.js, lodgingLinks). Le motif précédent acceptait
  // n'importe quelle extension — « airbnb.zip », « airbnb.top », enregistrables par n'importe qui — ce qui permettait de
  // faire pointer le bouton « Logement » d'un PDF officiel vers un domaine d'hameçonnage (3e audit du 17/09/2026).
  /^www\.airbnb\.fr$/,
  /^(?:[a-z0-9-]+\.)*booking\.com$/,
  /^(?:[a-z0-9-]+\.)*visorando\.com$/,
  /^hiking\.waymarkedtrails\.org$/,
  /^(?:[a-z0-9-]+\.)*(?:wikipedia|wikimedia)\.org$/
];
const PDF_LINK_HOSTS = (function(){
  const hosts = new Set();
  function addUrl(u){
    try { const p = new URL(u); if(p.protocol === 'https:') hosts.add(p.hostname.toLowerCase()); } catch(e){ /* URL modèle invalide */ }
  }
  function scan(value){
    const matches = JSON.stringify(value || null).match(/https:\/\/[^"\s\\]+/g) || [];
    matches.forEach(addUrl);
  }
  scan(TripData.LODGING_RULES);
  scan(TripData.VAN_RULES);
  scan(TripData.MOTO_RULES);
  Object.keys(TripDataCountries).forEach(function(cc){ const v = TripDataCountries[cc].vignette; if(v && v.url) addUrl(v.url); });
  (HIKING_DATA.portals || []).forEach(function(p){ if(p && typeof p.url === 'string') addUrl(p.url.replace(/\{[a-z]+\}/g, 'x')); });
  return hosts;
})();
// Lien écrit dans le PDF = forme ANALYSÉE (URL.href), jamais la chaîne reçue (12e audit du 19/09/2026) : le contrôle
// portait sur new URL(u) mais c'est u qui était écrit — « https://www.booking.com\@evil.example/phish » (hôte
// booking.com pour l'analyseur WHATWG, evil.example pour d'autres), une tabulation ou une espace en tête passaient tels
// quels jusqu'au lecteur PDF. Refusés aussi : barre oblique inverse et « @ » n'importe où (sans usage dans les liens
// produits par l'application, ils ne servent qu'à tromper un autre analyseur ou le lecteur), identifiant ou mot de
// passe, port explicite, et toute forme analysée non ASCII ou contenant une espace.
function parseHttpsUrl(u){
  if(typeof u !== 'string' || u.length >= 500 || /[\\@]/.test(u)) return null;
  let p;
  try { p = new URL(u); } catch(e){ return null; }
  if(p.protocol !== 'https:' || p.username || p.password || p.port) return null;
  if(!/^[\x21-\x7e]+$/.test(p.href) || /[\\@]/.test(p.href)) return null;
  return p;
}
// Lien autorisé du PDF (voir PDF_LINK_HOSTS) : sa forme analysée, sinon null.
function pdfLink(u){
  const p = parseHttpsUrl(u);
  if(!p) return null;
  const host = p.hostname.toLowerCase();
  return (PDF_LINK_HOSTS.has(host) || PDF_LINK_HOST_PATTERNS.some(re => re.test(host))) ? p.href : null;
}
// Zones à tension : source France Diplomatie uniquement (forme analysée, voir parseHttpsUrl), sinon null.
function diplomatieLink(u){
  const p = parseHttpsUrl(u);
  return p && /^(?:www\.)?diplomatie\.gouv\.fr$/i.test(p.hostname) ? p.href : null;
}
// Niveau de tension envoyé par le client ({level:'red'|'orange', source?}) : validé strictement, sinon ignoré.
function pdfTension(t){
  if(!t || typeof t !== 'object' || Array.isArray(t)) return null;
  if(t.level !== 'red' && t.level !== 'orange') return null;
  return { level: t.level, source: diplomatieLink(t.source) };
}
function pdfTensionText(tension, isDeparture){
  const where = isDeparture ? 'Point de départ situé en zone ' : 'Étape située en zone ';
  const level = tension.level === 'red' ? 'formellement déconseillée' : 'déconseillée sauf raison impérative';
  return 'ATTENTION — ' + where + level + ' par le ministère des Affaires étrangères' +
    (tension.source ? ' (source : France Diplomatie, conseils aux voyageurs)' : '') +
    '. Consultez les conseils aux voyageurs avant de partir.';
}
// Filet de sécurité contre un payload abusif (chaîne énorme) qui ralentirait inutilement la mise
// en page du PDF — jamais atteint en usage normal, l'app elle-même ne produit rien d'aussi long.
function clip(s, max){
  // Chaînes, nombres et booléens seulement (9e audit du 18/09/2026) : un objet forgé ({"toString":1}) faisait lever
  // String() en pleine mise en page du PDF, livré alors coupé net, sans la mention « document tronqué ».
  s = (typeof s === 'string') ? s : (typeof s === 'number' || typeof s === 'boolean') ? String(s) : '';
  // Sauts de ligne remplacés par une espace (12e audit du 19/09/2026) : drawText fait de chaque « \n » un paragraphe,
  // et un corps de 32 Ko de « x\n » produisait 198 pages. Tout texte venu du client passe
  // par ici (directement ou par pdfClientText / pdfClientList / pdfClientBadge).
  s = s.replace(/[\r\n\u2028\u2029]+/g, ' ');
  if(s.length <= max) return s;
  // Coupure entre deux points de code (13e audit du 19/09/2026) : slice coupait en unités UTF-16 et laissait la moitié
  // haute d'un emoji (paire de substitution) avant « … », dessinée comme un carré vide. La borne reste en unités UTF-16
  // (même taille maximale qu'avant pour tous les appelants) ; on recule d'une unité si la coupure tombe dans une paire.
  let end = max - 1;
  const last = s.charCodeAt(end - 1);
  if(end > 0 && last >= 0xD800 && last <= 0xDBFF) end--;
  return s.slice(0, end) + '…';
}

// Palette approximative des tokens CSS du site (voir public/css/style.css, thème clair) — pdfkit
// ne peut pas lire les variables CSS, donc on les recopie ici en dur. Polices : Noto embarquées (dossier pdf-fonts/, voir
// lib/pdf-text.js) — les 14 polices standard PDF (Helvetica/Times) ne couvraient ni le cyrillique, ni le grec, ni
// l'arabe, ni les écritures d'Asie, ni même « ł » ou « ő » : un PDF en japonais ou en polonais sortait illisible.
// Langues acceptées pour le PDF : celles de l'interface (SUPPORTED de public/js/i18n.js, lu une fois au démarrage).
const PDF_LANGS = (function(){
  try {
    const src = fs.readFileSync(path.join(ROOT, 'public', 'js', 'i18n.js'), 'utf8').slice(0, 20000);
    const m = src.match(/var SUPPORTED = \[([^\]]*)\]/);
    return new Set(m ? m[1].split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean) : ['fr']);
  } catch(e){ return new Set(['fr']); }
})();
const PDF_INK = '#1A1F1C';
const PDF_INK_SOFT = '#4A544D';
const PDF_ACCENT = '#B04A19';   // --accent (orange) : titre, badge retour, ligne "fin de mission"
const PDF_ACCENT_2 = '#8A6414'; // --accent-2 (moutarde) : activités "à faire sur place"
const PDF_ACCENT_3 = '#1F4F44'; // --accent-3 (teal) : badges de jour, liens (rando/logement), sac
const PDF_BG = '#F6F1E2';       // --surface : fond du bandeau d'en-tête
const PDF_BG_ALT = '#ECE4CC';   // --surface-2 : fond des jetons de statistiques
const PDF_LINE = '#C9C2A0';
const PDF_LINE_STRONG = '#8F8564'; // ligne de jonction entre les badges de jour ("timeline")
const PDF_DANGER = '#B3261E';      // zone à tension « rouge » (formellement déconseillée)
// Plafond de PUCES listées par étape (audit du 17/09/2026 ; une puce peut occuper plusieurs lignes) : une étape peut en
// lister jusqu'à ~30 (restrictions, activités, logements…), une étape ordinaire une douzaine ; les avertissements de zone
// à tension ne sont jamais retirés par ce plafond.
const PDF_MAX_BULLETS_PER_LEG = 20;
// Budget de mise en page d'un export (3e audit du 17/09/2026). Le plafond de puces ne bornait QUE leur nombre, pas leur
// longueur : un corps de 109 Ko en hindi (sous la limite de taille) demandait 20 s de mise en page, pendant lesquelles le
// process — synchrone — ne répondait plus à personne. Au-delà de ce budget, la mise en page s'arrête et le document porte
// la mention « document tronqué ». Un export réel coûte 0,1 à 2,2 s selon l'écriture (dzongkha puis bengali les plus lents).
const PDF_BUILD_BUDGET_MS = 3500;

// Boutiques OFFICIELLES de vignette autoroutière (pas de revendeur tiers) : COUNTRIES[cc].vignette.url de
// public/js/trip-data.js, la même donnée que l'écran (source unique, 12e audit du 19/09/2026). L'ancienne copie en dur
// ici — justifiée par un commentaire faux, trip-data.js étant déjà importé plus haut — ne connaissait que six pays : la
// Bulgarie, la Roumanie, la Moldavie et la Biélorussie n'avaient aucun rappel de vignette dans le PDF. Chaque lien passe
// par les mêmes contrôles que les autres liens du PDF (https, sans identifiant ni port, forme analysée) ; un lien
// invalide dans la donnée retire le pays plutôt que d'écrire un lien douteux. Voir buildTripPdf pour l'usage.
const VIGNETTE_URLS = (function(){
  const out = Object.create(null);
  Object.keys(TripDataCountries).forEach(function(cc){
    const v = TripDataCountries[cc] && TripDataCountries[cc].vignette;
    const p = v && parseHttpsUrl(v.url);
    if(/^[A-Z]{2}$/.test(cc) && p) out[cc] = p.href;
  });
  return out;
})();

// Fond crème (--bg du site) plutôt qu'une page blanche brute — posé sous tout le reste à chaque
// nouvelle page (page 1 explicitement, pages suivantes via pdfRunningHeader/'pageAdded').
function pdfPageBackground(doc){
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PDF_BG);
}

function pdfEnsureSpace(doc, minHeight){
  const bottom = doc.page.height - doc.page.margins.bottom;
  if(doc.y + minHeight > bottom) doc.addPage();
}

// Mise en page du texte : lib/pdf-text.js (polices Noto embarquées, repli caractère par caractère, ordre bidirectionnel,
// coupure des lignes des écritures sans espaces). `ctx` : { lang, rtl } du document. En langue de droite à gauche, toute
// la page est en miroir : X logique (depuis le bord de départ de la ligne) -> X réel via pdfX.
function pdfX(doc, ctx, x, width){
  return ctx.rtl ? doc.page.width - x - width : x;
}
function pdfText(doc, ctx, str, x, width, opts){
  // Budget épuisé : plus aucun texte n'est préparé (9e audit du 18/09/2026). drawText ne contrôlait le budget qu'à
  // partir de sa première ligne, après le choix des polices, l'ordre bidirectionnel et la coupure des lignes — des
  // textes longs en écriture complexe dépassaient ainsi le budget de 45 % (4,9 s mesurées pour 3,5 s).
  if(pdfTimeUp(ctx)) return;
  opts = opts || {};
  PdfText.drawText(doc, str, { x: pdfX(doc, ctx, x, width), width: width, lang: ctx.lang, size: opts.size || 10,
    bold: !!opts.bold, color: opts.color || PDF_INK, link: opts.link || null, underline: !!opts.link, align: opts.align,
    // Bas de page et budget de temps : un paragraphe long change de page au lieu d'être écrit hors de la feuille, et la
    // mise en page s'arrête net si le budget est dépassé (voir PDF_BUILD_BUDGET_MS).
    bottom: doc.page.height - doc.page.margins.bottom, onPageBreak: function(){ doc.addPage(); return doc.y; },
    deadline: ctx.deadline });
}

// Puce colorée (point plein) ou case à cocher (carré creux, pour le sac à préparer) suivie du
// texte — le point/la case est dessiné séparément du texte pour pouvoir lui donner une couleur
// différente selon la nature de la ligne (péage, activité, lien réel...), comme les icônes du site.
function pdfBullet(doc, ctx, text, x, width, opts){
  if(pdfTimeUp(ctx)) return; // voir pdfText
  opts = opts || {};
  pdfEnsureSpace(doc, 24);
  const size = 9.5;
  const markY = doc.y + size * 0.75;
  if(opts.checkbox){
    doc.lineWidth(1).rect(pdfX(doc, ctx, x - 3, 6.4), markY - 3.2, 6.4, 6.4).stroke(PDF_ACCENT_3);
  } else {
    doc.circle(pdfX(doc, ctx, x, 0), markY, 2.1).fill(opts.color || PDF_INK_SOFT);
  }
  pdfText(doc, ctx, text, x + 11, width - 11, { size: size, bold: opts.bold, link: opts.link,
    color: opts.textColor || (opts.link ? PDF_ACCENT_3 : PDF_INK) });
  doc.y += 1.5;
}

// Jeton arrondi façon ".stats span" du site (voir style.css) — la largeur dépend du texte, donc on
// la mesure avant de dessiner ; revient à la ligne si la suivante dépasserait la largeur utile.
function pdfChipRow(doc, ctx, items, x, maxWidth){
  const padX = 8, padY = 4.5, fontSize = 9, h = fontSize + padY * 2 + 2, gap = 6;
  const colors = [PDF_ACCENT_3, PDF_ACCENT_2, PDF_ACCENT];
  let cx = x, cy = doc.y, rowH = h;
  items.forEach(function(text, i){
    // Budget de mise en page (10e audit du 18/09/2026) : ces jetons y échappaient — 8 statistiques de 80 caractères
    // tibétains (2 Ko de corps) gelaient le process 5 à 10 s.
    if(pdfTimeUp(ctx)) return;
    const fullW = PdfText.textWidth(doc, text, { lang: ctx.lang, size: fontSize, bold: true }) + padX * 2;
    const w = Math.min(fullW, maxWidth);
    // Pastille plus large que la page (12e audit du 19/09/2026, pastilles portées à 140 caractères) : sur plusieurs
    // lignes (3 au plus) au lieu d'une seule ligne coupée net — fond agrandi de la hauteur des lignes en plus.
    const lineOpts = { x: 0, y: 0, width: w - padX * 2 + 1, lang: ctx.lang, size: fontSize, bold: true, measureOnly: true };
    const extraH = fullW > maxWidth
      ? PdfText.drawText(doc, text, Object.assign({}, lineOpts, { maxLines: 3 })) - PdfText.drawText(doc, text, Object.assign({}, lineOpts, { maxLines: 1 }))
      : 0;
    const chipH = h + Math.max(0, extraH);
    if(cx > x && cx + w > x + maxWidth){ cx = x; cy += rowH + gap; rowH = h; }
    const realX = pdfX(doc, ctx, cx, w);
    doc.roundedRect(realX, cy, w, chipH, h / 2).fill(colors[i % colors.length]);
    PdfText.drawText(doc, text, { x: realX + padX, y: cy + padY - 1, width: w - padX * 2 + 1, lang: ctx.lang, size: fontSize,
      bold: true, color: '#FFFFFF', align: 'center', maxLines: extraH > 0 ? 3 : 1, deadline: ctx.deadline });
    rowH = Math.max(rowH, chipH);
    cx += w + gap;
  });
  doc.y = cy + rowH;
}

// Bandeau de marque affiché en haut de chaque page suivant la première (qui a le grand bandeau
// complet, voir buildTripPdf) — juste assez pour rester identifiable si l'itinéraire déborde sur
// plusieurs pages, sans reproduire tout l'en-tête à chaque fois.
function pdfRunningHeader(doc, ctx, marginLeft, contentWidth, tripLabel){
  pdfPageBackground(doc);
  doc.rect(0, 0, doc.page.width, 34).fill(PDF_BG_ALT);
  const half = contentWidth / 2;
  PdfText.drawText(doc, "CAP SUR L'INCONNU", { x: pdfX(doc, ctx, marginLeft, half), y: 11, width: half, lang: 'fr', size: 10,
    bold: true, color: PDF_ACCENT, align: ctx.rtl ? 'right' : 'left', maxLines: 1 });
  if(!pdfTimeUp(ctx)){ // voir pdfChipRow (10e audit)
    PdfText.drawText(doc, clip(tripLabel, 60), { x: pdfX(doc, ctx, marginLeft + half, half), y: 12, width: half, lang: ctx.lang,
      size: 8.5, color: PDF_INK_SOFT, align: ctx.rtl ? 'left' : 'right', maxLines: 1, deadline: ctx.deadline });
  }
  doc.y = doc.page.margins.top;
}

// Texte traduit fourni par le navigateur (langue d'interface) : chaîne non vide, bornée ; sinon le texte français
// composé ici. Le serveur ne traduit rien lui-même : toutes les traductions vivent dans public/js/i18n.js.
// Budget de mise en page épuisé : plus aucune ligne n'est ajoutée (voir PDF_BUILD_BUDGET_MS).
function pdfTimeUp(ctx){
  if(!ctx.deadline) return false;
  if(performance.now() > ctx.deadline){ ctx.truncated = true; return true; }
  return false;
}
function pdfClientText(v, fallback, max){
  return (typeof v === 'string' && v.trim()) ? clip(v, max || 400) : fallback;
}
function pdfClientList(v, maxItems, maxLen){
  return Array.isArray(v) ? v.filter(s => typeof s === 'string' && s.trim()).slice(0, maxItems).map(s => clip(s, maxLen)) : null;
}
// Libellé du badge d'une étape fourni par le navigateur (champ `badge` de chaque élément de trip.legs, 12e audit du
// 19/09/2026) : l'écran affiche les chiffres de la langue (« ३ », « ٣ »), « ⟲ » pour le retour et des plages « 3–5 »,
// le PDF écrivait toujours « 3 » ou « R ». Chaîne courte (12 caractères au plus), sans caractère de contrôle ni de
// sens d'écriture (un badge ne doit pas réordonner la ligne), entièrement dessinable avec les polices du PDF (13e audit,
// voir pdfClientBadge) ; sinon null et le libellé calculé ici.
// Caractères invisibles aussi (14e audit du 19/09/2026) : un badge fait seulement d'espaces sans chasse, de joints ou de
// traits d'union conditionnels (U+200B, U+200D, U+2060, U+00AD, U+FEFF…) passait canRender et laissait un rond vide.
const PDF_BADGE_BAD_RE = /[\p{Cc}\p{Cf}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069\u2028\u2029]/u;
// Textes de secours du péage (12e audit du 19/09/2026, utilisés seulement sans texte du navigateur) : fourchette de la
// 11e passe, même règle que tollRange / tollRangeKind de public/js/app.js. Borne haute = amountMax, sinon amount ; borne
// basse = amountMin, sinon la borne haute (moteur plus ancien : montant unique). 'upTo' : borne basse nulle (des routes
// gratuites longent le trajet) ; 'single' : écart de moins de 0,50 € ou de moins de 10 % ; 'range' sinon. Nombres bornés.
function pdfTollRange(t){
  const num = v => { const n = Number(v); return isFinite(n) ? Math.min(Math.max(n, 0), 100000) : null; };
  const max = num(t.amountMax != null ? t.amountMax : t.amount) || 0;
  const minRaw = t.amountMin != null ? num(t.amountMin) : max;
  const min = Math.min(minRaw == null ? max : minRaw, max);
  const kind = !(min > 0) ? 'upTo' : (max - min < 0.5 || max - min < 0.1 * max) ? 'single' : 'range';
  return { min: min, max: max, kind: kind };
}
function pdfEuro(n){ return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
// « ~X € » (montant unique : borne haute, comme l'écran) ou « ~A à ~B € ».
function pdfTollAmountText(r){
  return r.kind === 'range' ? '~' + pdfEuro(r.min) + ' à ~' + pdfEuro(r.max) + ' €' : '~' + pdfEuro(r.max) + ' €';
}
function pdfClientBadge(v){
  if(typeof v !== 'string') return null;
  const s = v.trim();
  if(!s || Array.from(s).length > 12 || PDF_BADGE_BAD_RE.test(s)) return null;
  // 13e audit du 19/09/2026 :
  // - libellé dont un caractère n'a de glyphe dans AUCUNE police du PDF (« ⟲ » du retour, emoji) : refusé, le libellé
  //   calculé ici (« R », numéro) le remplace — sinon le rond affichait un carré vide (glyphe .notdef). Les chiffres des
  //   161 langues de l'interface et le tiret « – » des plages sont tous couverts (vérifié avec Intl.NumberFormat) ;
  // - plus de clip(s, 12) : la longueur est déjà bornée à 12 POINTS DE CODE ci-dessus, et clip, qui compte en unités
  //   UTF-16, coupait 7 emoji (14 unités) au milieu d'une paire de substitution. Sauts de ligne et caractères de contrôle
  //   sont déjà refusés par PDF_BADGE_BAD_RE ; une moitié de paire isolée l'est par PdfText.canRender.
  if(!PdfText.canRender(s)) return null;
  return s;
}

// Distances écrites par le serveur lui-même (13e audit du 19/09/2026) : textes de secours seulement — les textes traduits
// du navigateur, prioritaires, sont déjà dans l'unité choisie. payload.distanceUnit = 'mi' : valeur convertie (1 mi =
// 1,609344 km) puis arrondie à l'unité, comme les kilomètres ; toute autre valeur : kilomètres. Les valeurs reçues et
// les bornes contrôlées restent en kilomètres. Recensement des distances écrites par le serveur dans le PDF : total
// (pastille), distance d'étape et partie routière d'une traversée, distance max / éloignement minimum (overMaxLeg),
// rayon de recherche des bornes (noCharger). Hors PDF, seule /api/pois écrit une distance (« 12 km », randonnées
// OpenStreetMap) : donnée transmise au navigateur, qui la met en forme lui-même.
const KM_PER_MILE = 1.609344;
function pdfDistanceUnit(v){ return v === 'mi' ? 'mi' : 'km'; }
function pdfDist(km, unit){ return Math.round(unit === 'mi' ? km / KM_PER_MILE : km); }
function pdfDistText(km, unit){ return pdfDist(km, unit) + ' ' + unit; }

function buildTripPdf(doc, trip){
  const marginLeft = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const tripLabel = trip.tripLabel || trip.city || '';
  // Langue du document : code connu de l'interface (voir PDF_LANGS), français sinon.
  const lang = typeof trip.lang === 'string' && PDF_LANGS.has(trip.lang) ? trip.lang : 'fr';
  const ctx = { lang: lang, rtl: PdfText.isRtlLang(lang), deadline: performance.now() + PDF_BUILD_BUDGET_MS, truncated: false };
  const texts = (trip.texts && typeof trip.texts === 'object' && !Array.isArray(trip.texts)) ? trip.texts : {};
  // Unité des distances (payload.distanceUnit, voir pdfDistText) et mode de transport (payload.transportKey : clé de
  // TRANSPORT dans public/js/trip-data.js, ignorée sinon) — 13e audit du 19/09/2026.
  const unit = pdfDistanceUnit(trip.distanceUnit);
  const transportKey = typeof trip.transportKey === 'string' && Object.prototype.hasOwnProperty.call(TripData.TRANSPORT, trip.transportKey)
    ? trip.transportKey : null;
  // Mode sans classe de péage (vélo : tollClass null) : aucune autoroute, donc aucun rappel de vignette autoroutière — le
  // PDF en affichait une (Suisse, Autriche…) pour un voyage à vélo.
  const noVignette = !!transportKey && TripData.TRANSPORT[transportKey].tollClass == null;

  // Pages 2+ (si l'itinéraire déborde) : bandeau réduit, voir pdfRunningHeader. La page 1 existe
  // déjà à la construction du document (pdfkit l'ajoute avant qu'on ait pu s'abonner à
  // 'pageAdded') : elle n'est donc jamais concernée par ce bandeau réduit, seulement par le grand
  // en-tête ci-dessous — exactement le partage voulu entre les deux.
  doc.on('pageAdded', function(){ pdfRunningHeader(doc, ctx, marginLeft, contentWidth, tripLabel); });

  // ---- Grand bandeau d'en-tête (page 1 uniquement) ----
  pdfPageBackground(doc);
  doc.rect(0, 0, doc.page.width, 96).fill(PDF_ACCENT);
  PdfText.drawText(doc, "CAP SUR L'INCONNU", { x: marginLeft, y: 24, width: contentWidth, lang: 'fr', size: 22, bold: true,
    color: '#FFFFFF', align: ctx.rtl ? 'right' : 'left', maxLines: 1 });
  PdfText.drawText(doc, pdfClientText(texts.subtitle, clip(trip.city, 80) + ' — itinéraire mystère', 160),
    { x: marginLeft, y: 58, width: contentWidth, lang: lang, size: 12.5, color: '#FBE7D6', maxLines: 1, deadline: ctx.deadline });
  doc.y = 114;
  doc.x = marginLeft;

  // ---- Jetons de statistiques ----
  const stats = trip.stats || {};
  // 140 caractères par pastille (12e audit du 19/09/2026) : 80 coupaient au milieu d'un mot les traductions réelles de
  // « ferry (véhicules ; passagers en plus…) » (bulgare 85, lituanien 91, maya yucatèque 100 caractères).
  let statsBits = pdfClientList(texts.stats, 8, 140);
  if(!statsBits || !statsBits.length){
    statsBits = [];
    // Nombres uniquement (une chaîne de 400 Ko passait telle quelle dans la mise en page).
    const statNum = v => { const n = Math.round(Number(v)); return isFinite(n) && n >= 0 && n < 100000 ? n : null; };
    const sDays = statNum(stats.days), sCities = statNum(stats.cities), sNights = statNum(stats.nights);
    if(sDays) statsBits.push(sDays + (sDays > 1 ? ' jours' : ' jour'));
    if(sCities) statsBits.push(sCities + (sCities > 1 ? ' villes' : ' ville'));
    if(sNights != null) statsBits.push(sNights + (sNights > 1 ? ' nuitées' : ' nuitée'));
    // Un seul arrondi (14e audit) : 4,4 km arrondis à 4 puis convertis donnaient « 2 mi » là où l'écran écrit « 3 mi ».
    const totalKmRaw = Number(stats.totalKm);
    // 15e audit du 19/09/2026 : 0,5 à 0,8 km donnaient « ~0 mi au total » (arrondi dans l'unité affichée) — total omis
    // quand il s'arrondit à 0 dans cette unité, comme en km sous 0,5 km.
    if(statNum(stats.totalKm) && pdfDist(totalKmRaw, unit) >= 1) statsBits.push('~' + pdfDistText(totalKmRaw, unit) + ' au total');
    if(stats.toll && typeof stats.toll === 'object' && isFinite(Number(stats.toll.amountMax != null ? stats.toll.amountMax : stats.toll.amount))){
      // Fourchette (11e passe, voir pdfTollRange) : mêmes trois cas que les statistiques de l'écran.
      const r = pdfTollRange(stats.toll), on = !!stats.toll.enabled;
      if(r.kind === 'upTo') statsBits.push("jusqu'à ~" + pdfEuro(r.max) + ' € de péage ' + (on ? 'possible' : 'évités'));
      else statsBits.push(pdfTollAmountText(r) + ' de péage ' + (on ? 'estimé' : 'évités'));
    }
  }
  if(statsBits.length) pdfChipRow(doc, ctx, statsBits, marginLeft, contentWidth);
  doc.y += 14;

  // ---- Jours : badge rond numéroté + ligne de jonction façon "timeline" du site, contenu décalé
  // à côté des badges (contentX). Le badge du jour de retour utilise l'orange (comme la couleur
  // "final" du badge sur le site) plutôt que le teal des jours normaux. ----
  const contentX = marginLeft + 28;
  const contentWidth2 = contentWidth - 28;
  let prevBadgeCY = null;
  // Un seul rappel de vignette par pays sur tout le PDF (voir plus bas) — même logique que
  // shownVignetteCountries côté web (public/js/app.js, renderDays).
  const shownVignetteCountries = {};
  const legs = Array.isArray(trip.legs) ? trip.legs : [];
  // Avertissements valables pour tout le trajet (van, voiture électrique) : textes traduits du navigateur, sinon français.
  const PDF_NOTICES = {
    'van.notice': 'Van : hauteur, longueur, poids et vignettes antipollution peuvent limiter l\'accès à certaines routes, tunnels, cols ou centres-villes. Vérifiez avant de partir.',
    'charge.dataNote': 'Bornes de recharge : données Open Charge Map, couverture inégale selon les pays — vérifiez leur disponibilité et leur compatibilité avant de partir.',
    'days.overMaxPerCity': "Certaines villes comptent plus de jours que votre maximum par ville : il n'y a pas assez de villes-étapes possibles pour la durée de ce séjour."
  };
  const noticeTexts = (texts.notices && typeof texts.notices === 'object' && !Array.isArray(texts.notices)) ? texts.notices : {};
  // Clés connues, sans doublon (audit du 17/09/2026 : 9 800 fois la même clé bloquaient le serveur plus d'une seconde).
  Array.from(new Set((Array.isArray(trip.notices) ? trip.notices : []).filter(function(key){ return typeof key === 'string' && PDF_NOTICES.hasOwnProperty(key); }))).forEach(function(key){
    pdfBullet(doc, ctx, pdfClientText(noticeTexts[key], PDF_NOTICES[key]), marginLeft, contentWidth, { color: PDF_ACCENT_3 });
  });
  // Liens d'hébergement dans une autre devise que celle choisie (11e audit, texte du navigateur seulement).
  if(typeof texts.currencyNote === 'string' && texts.currencyNote.trim()){
    pdfBullet(doc, ctx, clip(texts.currencyNote, 240), marginLeft, contentWidth, { color: PDF_ACCENT_3 });
  }
  // Zones à tension (France Diplomatie) : départ, puis chaque étape — en tête, en gras, lien vers la fiche pays.
  let tensionShown = false;
  const departureTension = pdfTension(trip.departureTension);
  if(departureTension){
    tensionShown = true;
    pdfBullet(doc, ctx, pdfClientText(texts.departureTension, pdfTensionText(departureTension, true)), marginLeft, contentWidth, { link: departureTension.source,
      color: departureTension.level === 'red' ? PDF_DANGER : PDF_ACCENT, textColor: departureTension.level === 'red' ? PDF_DANGER : PDF_ACCENT, bold: true });
    doc.y += 6;
  }
  legs.forEach(function(leg, idx){
    if(!leg || typeof leg !== 'object' || pdfTimeUp(ctx)) return;
    const lt = (leg.texts && typeof leg.texts === 'object' && !Array.isArray(leg.texts)) ? leg.texts : {};
    // Au plus PDF_MAX_BULLETS_PER_LEG puces pour cette étape, et rien au-delà du budget de temps (voir les constantes).
    let legLines = 0;
    function legBullet(text, x, width, opts){
      if(legLines++ >= PDF_MAX_BULLETS_PER_LEG || pdfTimeUp(ctx)) return;
      pdfBullet(doc, ctx, text, x, width, opts);
    }
    const pageBefore = doc.page;
    pdfEnsureSpace(doc, 74);
    const pageChanged = doc.page !== pageBefore;
    const dayTop = doc.y;
    const badgeCX = pdfX(doc, ctx, marginLeft + 9, 0), badgeCY = dayTop + 9;
    const isReturn = !!leg.isReturn;

    if(prevBadgeCY != null && !pageChanged){
      doc.lineWidth(1.3).moveTo(badgeCX, prevBadgeCY + 9).lineTo(badgeCX, badgeCY - 9).stroke(PDF_LINE_STRONG);
    }
    doc.circle(badgeCX, badgeCY, 9).fill(isReturn ? PDF_ACCENT : PDF_ACCENT_3);
    // Libellé de l'écran (leg.badge, voir pdfClientBadge), sinon « R » ou le numéro. Réduit pour tenir dans le rond
    // (« 12–14 », chiffres d'autres écritures) : 9 pt, jusqu'à 5 pt.
    const clientBadge = pdfClientBadge(leg.badge);
    const badgeText = clientBadge || (isReturn ? 'R' : String(idx + 1));
    const badgeLang = clientBadge ? lang : 'fr';
    let badgeSize = 9;
    if(clientBadge){
      const bw = PdfText.textWidth(doc, badgeText, { lang: badgeLang, size: 9, bold: true });
      if(bw > 16) badgeSize = Math.max(5, 9 * 16 / bw);
    }
    PdfText.drawText(doc, badgeText, { x: badgeCX - 11, y: badgeCY - badgeSize * 0.72, width: 22, lang: badgeLang, size: badgeSize,
      bold: true, color: '#FFFFFF', align: 'center', maxLines: 1 });
    prevBadgeCY = badgeCY;

    doc.y = dayTop;
    pdfText(doc, ctx, clip(leg.label, 120), contentX, contentWidth2, { size: 12.5, bold: true, color: PDF_ACCENT_3 });
    if(leg.distanceKm != null && leg.travelTime){
      const routeWord = leg.ferryInfo ? ' de traversée' : ' de route';
      // 16e audit du 20/09/2026 : mêmes bornes que le total de l'en-tête (voir plus haut) pour les distances du texte de
      // SECOURS d'une étape — « 0 mi » (0,5 à 0,8 km convertis), les valeurs négatives et « 6.21e+307 mi » (1e+308 km)
      // sortaient encore pour distanceKm comme pour roadKm. Distance écrite seulement si 0 < km < 100000 ET si elle ne
      // s'arrondit pas à 0 dans l'unité affichée ; sinon rien du tout, sans séparateur orphelin.
      // 17e audit du 20/09/2026 : la borne haute était contrôlée sur la valeur BRUTE, pas sur celle qui est écrite.
      // 99 999,6 km passait (< 100 000) puis s'arrondissait à « 100000 km » — la valeur même que la borne devait
      // interdire. Les deux bornes portent désormais sur le nombre affiché : au moins 1, strictement moins de 100 000,
      // dans l'unité d'affichage.
      const legDistText = v => {
        const n = Number(v);
        if(!isFinite(n) || n <= 0) return null;
        const shown = pdfDist(n, unit);
        return (shown >= 1 && shown < 100000) ? pdfDistText(n, unit) : null;
      };
      // Étape avec traversée : partie par la route jusqu'au port et depuis le port d'arrivée, avant la traversée.
      const roadDist = leg.ferryInfo && leg.roadTime ? legDistText(leg.roadKm) : null;
      const roadPart = roadDist ? '~ ' + clip(leg.roadTime, 20) + ' de route · ' + roadDist + ' + ' : '';
      const legDist = legDistText(leg.distanceKm);
      pdfText(doc, ctx, pdfClientText(lt.route, roadPart + '~ ' + clip(leg.travelTime, 20) + routeWord + (legDist ? ' · ' + legDist : ''), 160),
        contentX, contentWidth2, { size: 9, color: PDF_INK_SOFT });
    }
    const stopLabel = (isReturn ? 'Retour vers ' : 'Étape mystère : ') + clip(leg.stop, 100) +
      (leg.cpBadge ? ' (' + clip(leg.cpBadge, 20) + ')' : '');
    pdfText(doc, ctx, pdfClientText(lt.stop, stopLabel, 160), contentX, contentWidth2, { size: 10.5, bold: true, color: PDF_INK });
    doc.y += 4;
    const legTension = isReturn ? null : pdfTension(leg.tension);
    if(legTension){
      tensionShown = true;
      const tensionColor = legTension.level === 'red' ? PDF_DANGER : PDF_ACCENT;
      pdfBullet(doc, ctx, pdfClientText(lt.tension, pdfTensionText(legTension, false)), contentX, contentWidth2, { link: legTension.source, color: tensionColor, textColor: tensionColor, bold: true });
    }

    // Trajet au-delà de la distance max entre étapes, imposé par l'éloignement minimum (voir overMaxLeg dans
    // lib/trip-engine.js). Nombres seulement, bornés ; texte du navigateur sinon français.
    if(leg.overMaxLeg && typeof leg.overMaxLeg === 'object'){
      const maxKm = Math.round(Number(leg.overMaxLeg.max)), minKm = Math.round(Number(leg.overMaxLeg.min));
      // Bornes du moteur (distance max 5 à 3 000 km, éloignement 3 000 km au plus) : une valeur hors bornes (requête
      // forgée) n'affiche rien.
      if(maxKm >= 5 && maxKm <= 3000 && minKm >= 1 && minKm <= 3000) legBullet(pdfClientText(lt.overMaxLeg, "Trajet plus long que votre distance maximale entre étapes (" + pdfDistText(maxKm, unit) + ") : c'est l'éloignement minimum demandé (" + pdfDistText(minKm, unit) + ") qui l'impose."),
        contentX, contentWidth2, { color: PDF_ACCENT, textColor: PDF_ACCENT });
    }
    if(leg.tollInfo){
      const t = leg.tollInfo;
      // Fourchette (11e passe) : mêmes phrases que l'écran en français (toll.estimated / estimatedRange / possibleUpTo et
      // leurs variantes « option sans péage », public/js/i18n.js).
      const r = pdfTollRange(t), on = !!t.enabled;
      let tollTxt;
      if(r.kind === 'upTo'){
        tollTxt = on ? "Péage possible : jusqu'à ~" + pdfEuro(r.max) + " € selon l'itinéraire (des autoroutes gratuites longent ce trajet)."
          : "Option sans péage : sections à péage évitées (jusqu'à ~" + pdfEuro(r.max) + " € selon l'itinéraire ; des autoroutes gratuites longent aussi ce trajet).";
      } else if(r.kind === 'range'){
        tollTxt = on ? 'Péage estimé : ' + pdfTollAmountText(r) + " selon l'itinéraire."
          : 'Option sans péage : sections à péage évitées (' + pdfTollAmountText(r) + " selon l'itinéraire).";
      } else {
        tollTxt = on ? 'Péage estimé : ' + pdfTollAmountText(r) + '.' : 'Option sans péage : sections à péage évitées (' + pdfTollAmountText(r) + ').';
      }
      tollTxt += ' Estimation au kilomètre : le montant réel dépend des sections réellement empruntées.';
      // Barème des pays concernés : codes vérifiés contre TOLL_SOURCE, jamais de texte venu du client.
      const tollSources = (Array.isArray(t.countries) ? t.countries : []).slice(0, 5)
        .map(c => Object.prototype.hasOwnProperty.call(TripDataTollSource, c) ? TripDataTollSource[c] : null)
        .filter((x, i, a) => x && a.indexOf(x) === i);
      legBullet(pdfClientText(lt.toll, tollTxt + (tollSources.length ? ' Barème : ' + tollSources.join(' + ') + '.' : '')), contentX, contentWidth2);
    }
    if(leg.chargeInfo && typeof leg.chargeInfo === 'object'){
      const c = Object.assign({}, leg.chargeInfo, { stops: Math.min(Math.max(Math.round(Number(leg.chargeInfo.stops)) || 0, 0), 99),
        minutes: Math.min(Math.max(Math.round(Number(leg.chargeInfo.minutes)) || 0, 0), 9999) });
      if(c.stops > 0 && c.real && Array.isArray(c.stations)){
        const places = c.stations.slice(0, 10).map(function(s){ return clip((s && s.near) || '', 60); }).filter(Boolean).join(', ');
        legBullet(pdfClientText(lt.charge, c.stops + ' pause' + (c.stops > 1 ? 's' : '') + ' recharge (~' + Math.round(c.minutes) + ' min au total) sur ' +
          (c.stops > 1 ? 'des bornes réelles' : 'une borne réelle') + (places ? ' : ' + places : '') + '.', 800), contentX, contentWidth2);
      } else if(c.stops > 0){
        legBullet(pdfClientText(lt.charge, c.stops + ' pause' + (c.stops > 1 ? 's' : '') + ' recharge estimée' + (c.stops > 1 ? 's' : '') +
          ' (~' + Math.round(c.minutes) + ' min au total) sur borne rapide.'), contentX, contentWidth2);
      }
      if(c.noChargerNearArrival){
        legBullet(pdfClientText(lt.noCharger, 'Aucune borne publique connue à moins de ' + pdfDistText(20, unit) + ' de l\'arrivée : prévoyez de recharger à l\'hébergement.'), contentX, contentWidth2, { color: PDF_ACCENT_3 });
      }
    }
    if(Array.isArray(leg.restrictions)){
      const RESTRICTION_TEXT = {
        'van.lez': 'Zone à faibles émissions — {name} : accès selon la norme antipollution de votre véhicule.',
        'van.ztl': 'Zone à trafic limité — {name} : accès interdit aux non-résidents, verbalisation automatique.',
        'van.tunnel': '{name} : limite de hauteur, de longueur ou de poids.',
        'van.pass': '{name} : col ou route de montagne restreint aux véhicules longs.',
        'van.road': '{name} : route restreinte ou interdite aux grands véhicules.',
        'moto.noMotorway': '{name} : autoroutes interdites aux motos, trajet estimé par les routes secondaires.',
        'moto.noMotorwayCc': '{name} : autoroutes interdites aux motos de moins de {cc} cm³, vérifiez selon votre moto.',
        'moto.partial': '{name} : certaines autoroutes ou voies rapides sont interdites aux motos, vérifiez votre itinéraire.',
        'moto.cityBan': '{name} : circulation des motos interdite ou restreinte.'
      };
      const restrictionTexts = Array.isArray(lt.restrictions) ? lt.restrictions : [];
      leg.restrictions.slice(0, 12).forEach(function(r, ri){
        if(!r) return;
        const tpl = RESTRICTION_TEXT[String(r.kind) + '.' + String(r.type)];
        if(!tpl) return;
        // Remplacement par fonction : dans une chaîne de remplacement, « $' », « $& »… venus du client étaient interprétés.
        const name = clip(r.name || '', 80), cc = String(Number(r.minCc) || '');
        const text = tpl.replace('{name}', function(){ return name; }).replace('{cc}', function(){ return cc; });
        legBullet(pdfClientText(restrictionTexts[ri], text), contentX, contentWidth2, { link: pdfLink(r.source), color: PDF_ACCENT_3 });
      });
    }
    if(leg.ferryInfo){
      const f = leg.ferryInfo;
      // Textes de secours de la 11e passe (12e audit du 19/09/2026), mêmes phrases que l'écran en français (ferryLabel,
      // ferryPriceText, ferryText de public/js/app.js) : train-auto (mode 'train'), ce que couvre le tarif (priceCovers,
      // tarif piéton footAmount), durée « environ » quand elle n'est pas publiée (durationEstimated). La durée n'est
      // écrite que si le navigateur envoie durationH (heures, nombre borné) ; priceCovers absent ou inconnu : montant seul.
      const ferryLabel = f.mode === 'train' ? 'Train-auto' : 'Traversée en ferry';
      const route = clip(f.route || '', 60);
      const durH = Number(f.durationH);
      let dur = '';
      if(typeof f.durationH === 'number' && durH > 0 && durH < 100){
        const totalMin = Math.round(durH * 60), h = Math.floor(totalMin / 60), m = totalMin % 60;
        dur = (h ? h + ' h' : '') + (h && m ? ' ' : '') + (m || !h ? m + ' min' : '');
        if(f.durationEstimated === true) dur = 'environ ' + dur;
      }
      const amount = typeof f.amount === 'number' && isFinite(f.amount) && f.amount >= 0 && f.amount < 100000 ? f.amount : null;
      let ferryTxt = ferryLabel + (route ? ' — ' + route : '');
      if(amount !== null){
        const a = '~' + pdfEuro(amount) + ' €';
        const footN = Number(f.footAmount);
        const foot = typeof f.footAmount === 'number' && footN > 0 && footN < 100000 ? '~' + pdfEuro(footN) + ' €' : null;
        let price;
        if(amount === 0) price = 'gratuit';
        else if(f.priceCovers === 'vehicle') price = foot ? a + ' pour le véhicule, + ' + foot + ' par personne' : a + ' pour le véhicule, passagers en plus';
        else if(f.priceCovers === 'vehicleAndDriver') price = foot ? a + ' véhicule et conducteur, + ' + foot + ' par passager' : a + ' véhicule et conducteur, autres passagers en plus';
        else if(f.priceCovers === 'vehicleAndOccupants') price = a + ', occupants compris';
        else price = a;
        ferryTxt += ' — ' + price + (dur ? ' · ' + dur + ' de traversée' : '') + '.';
      } else {
        // Liaison réelle sans tarif fixe publié (voir priceStatus dans lib/trip-engine.js).
        ferryTxt += (dur ? ' · ' + dur + ' de traversée' : '') + '. ' + (f.priceStatus === 'variable'
          ? 'Tarif variable, vérifiez avant votre voyage.' : 'Tarif non communiqué, renseignez-vous avant votre trajet.');
      }
      legBullet(pdfClientText(lt.ferry, ferryTxt), contentX, contentWidth2);
    }
    // Rappel vignette : une seule fois par pays sur tout le PDF, comme côté web (voir
    // shownVignetteCountries plus haut).
    // Rappels NOMMÉS envoyés par le navigateur (11e audit : pays de départ, pays traversés, pays d'arrivée), un par pays :
    // seul le CODE pays du client est retenu, vérifié contre VIGNETTE_URLS — le lien est toujours celui du serveur.
    // Aucun rappel (ni nommé, ni de repli) pour un mode sans péage (vélo, voir noVignette plus haut).
    const clientVignettes = !noVignette && Array.isArray(lt.vignettes) ? lt.vignettes.slice(0, 8) : [];
    clientVignettes.forEach(function(v){
      const cc = v && typeof v.country === 'string' ? v.country : '';
      if(!Object.prototype.hasOwnProperty.call(VIGNETTE_URLS, cc) || shownVignetteCountries[cc]) return;
      shownVignetteCountries[cc] = true;
      legBullet(pdfClientText(v.text, 'Vignette autoroutière obligatoire (' + cc + ') — pensez à la commander avant de partir.', 200),
        contentX, contentWidth2, { link: VIGNETTE_URLS[cc], color: PDF_ACCENT_3 });
    });
    const vignetteUrl = !noVignette && leg.country && Object.prototype.hasOwnProperty.call(VIGNETTE_URLS, leg.country) && VIGNETTE_URLS[leg.country];
    if(vignetteUrl && !shownVignetteCountries[leg.country]){
      shownVignetteCountries[leg.country] = true;
      legBullet(pdfClientText(texts.vignette, 'Vignette autoroutière obligatoire dans ce pays — pensez à la commander avant de partir.'),
        contentX, contentWidth2, { link: vignetteUrl, color: PDF_ACCENT_3 });
    }
    const activities = Array.isArray(leg.activities) ? leg.activities : [];
    activities.slice(0, 6).forEach(function(act){
      if(!act || !act.label) return;
      const text = clip(act.label, 140) + (act.typeLabel ? ' — ' + clip(act.typeLabel, 80) : '') +
        (act.source ? ' (' + pdfClientText(act.sourceLabel, 'Source : ' + clip(act.source, 30), 60) + ')' : '');
      const link = pdfLink(act.hikeUrl);
      legBullet(text, contentX, contentWidth2, { link: link, color: link ? PDF_ACCENT_3 : PDF_ACCENT_2 });
    });
    if(leg.lodgingLinks && leg.checkInLabel){
      // checkInLabel peut être une seule date ("20 août") ou une plage ("20 août → 22 août") pour
      // un séjour de plusieurs nuits au même endroit — une seule recherche pour tout le séjour,
      // pas une par nuit (voir buildTripExportPayload côté client).
      const links = leg.lodgingLinks;
      const lodgingLabel = pdfClientText(lt.lodging, 'Logement · ' + clip(leg.checkInLabel, 40), 120);
      // Forme analysée des liens (voir pdfLink), jamais la chaîne reçue.
      const airbnbLink = pdfLink(links.airbnb), bookingLink = pdfLink(links.booking);
      if(airbnbLink) legBullet(lodgingLabel + ' — Airbnb', contentX, contentWidth2, { link: airbnbLink });
      if(bookingLink) legBullet(lodgingLabel + ' — Booking.com', contentX, contentWidth2, { link: bookingLink });
      // Plateformes locales (pays où Airbnb ou Booking.com est absent ou faible).
      // Liens hors des hôtes attendus (voir pdfLink) : ligne omise, pas seulement le lien.
      const localLinks = (Array.isArray(links.local) ? links.local.slice(0, 4) : [])
        .map(p => p ? { name: p.name, link: pdfLink(p.url) } : null).filter(p => p && p.link);
      localLinks.forEach(function(p){
        legBullet(lodgingLabel + ' — ' + clip(p.name || '', 40), contentX, contentWidth2, { link: p.link });
      });
      if(!airbnbLink && !bookingLink && !localLinks.length){
        legBullet(pdfClientText(texts.lodgingNone, 'Aucune plateforme de réservation en ligne connue ici : contactez directement les hébergements ou l\'office du tourisme.'), contentX, contentWidth2);
      }
    }
    if(isReturn){
      pdfBullet(doc, ctx, pdfClientText(texts.endMission, 'Fin de mission — retour à la maison, road trip mystère bouclé.'), contentX, contentWidth2, { color: PDF_ACCENT });
    }
    doc.y += 10;
  });

  // ---- Sac à préparer : puces remplacées par des cases à cocher, comme sur le site ----
  const packing = Array.isArray(trip.packing) ? trip.packing : [];
  if(packing.length){
    pdfEnsureSpace(doc, 60);
    doc.lineWidth(1).moveTo(marginLeft, doc.y).lineTo(marginLeft + contentWidth, doc.y).stroke(PDF_LINE);
    doc.y += 8;
    pdfText(doc, ctx, pdfClientText(texts.packTitle, 'Sac à préparer', 80), marginLeft, contentWidth, { size: 13, bold: true, color: PDF_ACCENT });
    pdfText(doc, ctx, pdfClientText(texts.packSub, 'Pour ' + clip(trip.transportLabel, 60) + ', budget ' + clip(trip.budgetLabel, 40) + '.', 160),
      marginLeft, contentWidth, { size: 9.5, color: PDF_INK_SOFT });
    doc.y += 6;
    packing.slice(0, 60).forEach(function(item){
      if(pdfTimeUp(ctx)) return;
      pdfBullet(doc, ctx, clip(item, 120), marginLeft + 4, contentWidth - 4, { checkbox: true });
    });
  }

  // Document tronqué faute de temps : signalé au lecteur plutôt que de laisser croire à un itinéraire complet.
  // pdfTimeUp d'abord (10e audit du 18/09/2026) : si le budget s'est épuisé pendant le dernier paragraphe, rien n'avait
  // encore posé ctx.truncated — la mention manquait et le pied de page (sources, attribution OSM) disparaissait.
  pdfTimeUp(ctx);
  if(ctx.truncated){
    ctx.deadline = 0; // la mention elle-même s'écrit toujours
    pdfBullet(doc, ctx, pdfClientText(texts.truncated, 'Document tronqué : cet itinéraire contient trop de texte pour être mis en page en entier.', 200),
      marginLeft, contentWidth, { color: PDF_ACCENT, textColor: PDF_ACCENT });
  }
  doc.y += 12;
  pdfEnsureSpace(doc, 30);
  doc.lineWidth(1).moveTo(marginLeft, doc.y).lineTo(marginLeft + contentWidth, doc.y).stroke(PDF_LINE);
  doc.y += 5;
  // Sources : noms propres, identiques dans toutes les langues ; phrase et date dans la langue du document
  // (modèle 'pdf.generated' avec {date} et {sources}, sinon français).
  const sources = 'IGN/geo.api.gouv.fr · GeoNames · OpenStreetMap (ODbL) · Wikipedia · Visorando · Open Charge Map' +
    (tensionShown ? ' · France Diplomatie (diplomatie.gouv.fr)' : '');
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  // Tronqué D'ABORD, repères vérifiés ensuite : l'inverse pouvait couper « {sources} » d'un modèle hostile et faire
  // disparaître la ligne d'attribution (OpenStreetMap, Wikipédia…).
  const generatedClipped = typeof texts.generated === 'string' ? clip(texts.generated, 300) : '';
  const generatedTpl = generatedClipped.includes('{date}') && generatedClipped.includes('{sources}') ? generatedClipped : null;
  const generatedDate = pdfClientText(texts.generatedDate, today, 40);
  const footer = generatedTpl
    ? generatedTpl.replace('{date}', function(){ return generatedDate; }).replace('{sources}', function(){ return sources; }) // voir {name} plus haut
    : 'Généré le ' + today + " par Cap sur l'inconnu — sources : " + sources + '.';
  pdfText(doc, ctx, footer, marginLeft, contentWidth, { size: 7.5, color: PDF_INK_SOFT });
}

module.exports = { buildTripPdf, clip, PDF_LANGS, PDF_BUILD_BUDGET_MS };
