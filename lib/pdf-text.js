'use strict';
// Texte multilingue pour les PDF (pdfkit) : polices Noto embarquées (dossier pdf-fonts/, licence SIL OFL 1.1), choix de la
// police CARACTÈRE PAR CARACTÈRE, ordre d'affichage bidirectionnel (arabe, persan, ourdou, kurde sorani, divehi),
// retour à la ligne selon les règles de chaque écriture (Intl.Segmenter : chinois, japonais, thaï, lao, khmer, birman sans
// espaces entre les mots).
//
// Pourquoi une mise en page maison plutôt que doc.text() : pdfkit n'utilise qu'UNE police par appel (un « : » ou un « — »
// absent de la police thaïe devenait un carré), ne connaît pas l'algorithme bidirectionnel Unicode (un nombre ou un mot
// latin dans une phrase arabe était mal placé) et coupe les lignes aux seules espaces (une phrase japonaise débordait).
// Chaque ligne est donc découpée ici en segments d'une même police et d'un même niveau bidirectionnel, ordonnés puis
// dessinés un par un (doc.text sans retour à la ligne). La mise en forme propre à chaque écriture (ligatures arabes,
// conjointes indiennes, voyelles thaïes…) reste celle de fontkit, appliquée à chaque segment ; les écritures de droite à
// gauche y sont déjà rendues dans l'ordre visuel (vérifié : hébreu, arabe, thâna).
const fs = require('fs');
const path = require('path');
const fontkit = require('fontkit');
const bidi = require('bidi-js')();

// pdf-fonts/ et non fonts/ : public/fonts/ est déjà servi au navigateur à l'adresse /fonts/ (polices d'affichage du
// site : tifinagh, éthiopien, tibétain, thâna, yi). Deux dossiers différents pour deux usages, sans collision d'URL.
const FONT_DIR = path.join(__dirname, '..', 'pdf-fonts');
// Ordre = priorité de repli, caractère par caractère (voir assignFonts). `cjk` : variante régionale des idéogrammes,
// choisie selon la langue du document (voir cjkPreference) ; les autres polices ne servent qu'en repli.
const FONT_DEFS = [
  { name: 'NotoSans', file: 'NotoSans-Regular.ttf', bold: 'NotoSans-Bold.ttf' },
  { name: 'NotoSansArabic', file: 'NotoSansArabic-Regular.ttf' },
  { name: 'NotoSansHebrew', file: 'NotoSansHebrew-Regular.ttf' },
  { name: 'NotoSansDevanagari', file: 'NotoSansDevanagari-Regular.ttf' },
  { name: 'NotoSansBengali', file: 'NotoSansBengali-Regular.ttf' },
  { name: 'NotoSansTamil', file: 'NotoSansTamil-Regular.ttf' },
  { name: 'NotoSansMalayalam', file: 'NotoSansMalayalam-Regular.ttf' },
  { name: 'NotoSansSinhala', file: 'NotoSansSinhala-Regular.ttf' },
  { name: 'NotoSansThai', file: 'NotoSansThai-Regular.ttf' },
  { name: 'NotoSansLao', file: 'NotoSansLao-Regular.ttf' },
  { name: 'NotoSansKhmer', file: 'NotoSansKhmer-Regular.ttf' },
  { name: 'NotoSansMyanmar', file: 'NotoSansMyanmar-Regular.ttf' },
  { name: 'NotoSansGeorgian', file: 'NotoSansGeorgian-Regular.ttf' },
  { name: 'NotoSansArmenian', file: 'NotoSansArmenian-Regular.ttf' },
  { name: 'NotoSansEthiopic', file: 'NotoSansEthiopic-Regular.ttf' },
  { name: 'NotoSansThaana', file: 'NotoSansThaana-Regular.ttf' },
  { name: 'NotoSansTifinagh', file: 'NotoSansTifinagh-Regular.ttf' },
  { name: 'NotoSerifTibetan', file: 'NotoSerifTibetan-Regular.ttf' },
  { name: 'NotoSansYi', file: 'NotoSansYi-Regular.ttf' },
  { name: 'NotoSansSC', file: 'NotoSansSC-Regular.otf', cjk: 'SC' },
  { name: 'NotoSansTC', file: 'NotoSansTC-Regular.otf', cjk: 'TC' },
  { name: 'NotoSansJP', file: 'NotoSansJP-Regular.otf', cjk: 'JP' },
  { name: 'NotoSansKR', file: 'NotoSansKR-Regular.otf', cjk: 'KR' }
];

let fonts = null; // chargées à la première utilisation : [{ name, buffer, boldBuffer, font }]
function loadFonts(){
  if(fonts) return fonts;
  fonts = FONT_DEFS.map(function(def){
    const buffer = fs.readFileSync(path.join(FONT_DIR, def.file));
    const out = { name: def.name, cjk: def.cjk || null, buffer: buffer, font: fontkit.create(buffer) };
    if(def.bold){
      out.boldBuffer = fs.readFileSync(path.join(FONT_DIR, def.bold));
      out.boldFont = fontkit.create(out.boldBuffer);
    }
    return out;
  });
  patchFontkitNullAnchors(fonts.find(f => f.name === 'NotoSansKhmer').font);
  return fonts;
}
// fontkit 2 : une ancre NULLE (autorisée par la spécification OpenType dans MarkBasePos/MarkLigPos, « pas d'attache pour
// ce composant ») faisait lever une TypeError — tout texte khmer plantait l'export. Le signe diacritique garde alors sa
// position par défaut, comme le prévoit la spécification. Correctif appliqué au prototype partagé du processeur GPOS.
function patchFontkitNullAnchors(font){
  try { font.layout('ក'); } catch(e){ /* le moteur de mise en forme existe désormais */ }
  const engine = font._layoutEngine && font._layoutEngine.engine;
  const gpos = engine && engine.GPOSProcessor;
  if(!gpos) return;
  const proto = Object.getPrototypeOf(gpos);
  if(proto.__nullAnchorPatched) return;
  const applyAnchor = proto.applyAnchor;
  proto.applyAnchor = function(markRecord, baseAnchor, baseGlyphIndex){
    if(!baseAnchor || !markRecord || !markRecord.markAnchor) return;
    return applyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex);
  };
  proto.__nullAnchorPatched = true;
}

// Polices d'un document pdfkit. doc.registerFont + doc.font feraient analyser chaque police de nouveau à CHAQUE export
// (fontkit.create : tables de mise en forme relues, moteur reconstruit — arabe ~3 s, hindi ~1,8 s par PDF, mesuré). La
// police déjà analysée au chargement est donc placée directement dans le cache de polices du document (_fontFamilies,
// clé = nom, que doc.font(nom) consulte avant toute lecture), enveloppée dans une EmbeddedFont propre au document (son
// propre sous-ensemble de glyphes). Création à la première utilisation : une police inutilisée n'est jamais incorporée.
let EmbeddedFontClass = null;
function embeddedFontClass(){
  if(EmbeddedFontClass) return EmbeddedFontClass;
  const PDFDocument = require('pdfkit');
  const probe = new PDFDocument({ autoFirstPage: false });
  probe.registerFont('probe', loadFonts()[0].buffer);
  probe.font('probe');
  EmbeddedFontClass = probe._font.constructor;
  return EmbeddedFontClass;
}
function registerFonts(doc){
  loadFonts();
  doc.__pdfTextFonts = true;
}
function useFont(doc, key){
  if(!doc._fontFamilies[key]){
    const list = loadFonts();
    const bold = /-Bold$/.test(key);
    const f = list.find(x => x.name === key.replace(/-Bold$/, ''));
    const Embedded = embeddedFontClass();
    doc._fontFamilies[key] = new Embedded(doc, bold && f.boldFont ? f.boldFont : f.font, 'F' + (++doc._fontCount));
  }
  return doc.font(key);
}

// Police CJK préférée selon la langue d'interface (formes régionales des idéogrammes).
function cjkPreference(lang){
  if(lang === 'ja') return 'JP';
  if(lang === 'ko') return 'KR';
  if(lang === 'zh-Hant' || lang === 'hak') return 'TC';
  return 'SC';
}
// Langues de l'interface écrites de droite à gauche (public/js/i18n.js) : la page entière est alors en miroir. L'hébreu
// n'est pas une langue de l'interface — sa police ne sert qu'aux noms de lieux, au sein d'une page de gauche à droite.
const RTL_LANGS = new Set(['ar', 'fa', 'ur', 'ckb', 'dv']);
function isRtlLang(lang){ return RTL_LANGS.has(lang); }

const COMMON_RE = /[\p{Script=Common}\p{Script=Inherited}]/u;
const HAN_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}]/u;
const NO_SPACE_SCRIPT_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Tibetan}\p{Script=Yi}]/u;

const coverageCache = new Map(); // `${fontName}|${codePoint}` -> bool
function hasGlyph(f, cp){
  const key = f.name + '|' + cp;
  let v = coverageCache.get(key);
  if(v === undefined){
    v = f.font.hasGlyphForCodePoint(cp);
    if(coverageCache.size > 200000) coverageCache.clear();
    coverageCache.set(key, v);
  }
  return v;
}
// Police de chaque caractère (index par code UTF-16) : écriture propre d'abord, ponctuation/chiffres/diacritiques
// rattachés à la police du caractère précédent quand elle les contient.
function assignFonts(text, lang){
  const list = loadFonts();
  const pref = cjkPreference(lang);
  const cjkOrder = list.filter(f => f.cjk).sort((a, b) => (b.cjk === pref) - (a.cjk === pref));
  const nonCjk = list.filter(f => !f.cjk);
  const out = new Array(text.length);
  let prev = null;
  for(let i = 0; i < text.length;){
    const cp = text.codePointAt(i);
    const len = cp > 0xffff ? 2 : 1;
    const ch = String.fromCodePoint(cp);
    let chosen = null;
    if(COMMON_RE.test(ch) && prev && hasGlyph(prev, cp)) chosen = prev;
    if(!chosen){
      const order = HAN_RE.test(ch) ? cjkOrder.concat(nonCjk) : nonCjk.concat(cjkOrder);
      chosen = order.find(f => hasGlyph(f, cp)) || prev || list[0];
    }
    for(let k = 0; k < len; k++) out[i + k] = chosen;
    if(!COMMON_RE.test(ch) || !prev) prev = chosen;
    i += len;
  }
  return out;
}

// Opportunités de coupure : [début, fin[ d'« atomes » insécables. Coupure après une espace, et entre deux mots des
// écritures sans espaces (Intl.Segmenter, dictionnaires ICU de Node).
function atomsOf(text, lang){
  let seg;
  try { seg = new Intl.Segmenter(lang || 'fr', { granularity: 'word' }); } catch(e){ seg = new Intl.Segmenter('fr', { granularity: 'word' }); }
  const pieces = Array.from(seg.segment(text));
  const atoms = [];
  let start = 0;
  for(let i = 0; i < pieces.length; i++){
    const p = pieces[i];
    const end = p.index + p.segment.length;
    const next = pieces[i + 1];
    if(!next){ atoms.push([start, end]); break; }
    const afterSpace = /\s$/.test(p.segment) && !/\s/.test(next.segment);
    const noSpaceBoundary = (NO_SPACE_SCRIPT_RE.test(p.segment) || NO_SPACE_SCRIPT_RE.test(next.segment)) && !/^\s/.test(next.segment) && !/^[\p{P}]/u.test(next.segment);
    if(afterSpace || noSpaceBoundary){ atoms.push([start, end]); start = end; }
  }
  return atoms;
}

// Liste de fonctionnalités OpenType TOUJOURS passée à pdfkit : sans elle, pdfkit met en forme chaque mot séparément et
// les recolle de gauche à droite (mots et espaces d'une phrase arabe ou hébraïque dans le désordre). Vide : fontkit
// applique les fonctionnalités par défaut de chaque écriture, sur le segment entier.
const PDF_FEATURES = [];
function fontKey(f, bold){ return f.boldBuffer && bold ? f.name + '-Bold' : f.name; }

// Largeur d'un intervalle [s, e[ découpé par police (police = changement de segment).
function measure(doc, text, fontsAt, s, e, size, bold){
  let w = 0;
  for(let i = s; i < e;){
    let j = i + 1;
    while(j < e && fontsAt[j] === fontsAt[i]) j++;
    w += safeWidth(doc, fontKey(fontsAt[i], bold), text.slice(i, j), size);
    i = j;
  }
  return w;
}
// Largeur d'un segment, mémorisée par document (clé police + texte, largeur ramenée à une taille de 1 pt : la largeur est
// proportionnelle à la taille). Sans ce cache, chaque caractère d'un PDF était mis en forme quatre fois : l'option
// `features` (indispensable, voir PDF_FEATURES) court-circuite le cache interne de pdfkit.
function safeWidth(doc, font, str, size){
  let cache = doc.__pdfTextWidths;
  if(!cache){ cache = doc.__pdfTextWidths = new Map(); }
  const key = font + '|' + str;
  let unit = cache.get(key);
  if(unit === undefined){
    // La mesure se fait à la taille 1000 (largeur par unité, réutilisable à n'importe quelle taille), mais elle doit
    // RENDRE LE DOCUMENT COMME ELLE L'A TROUVÉ : la taille était laissée à 1000 dans pdfkit, et l'appelant, juste
    // après, demandait doc.currentLineHeight() — qui renvoyait donc ~1362 points au lieu de 13,6. Chaque ligne
    // dépassait alors le bas de page et déclenchait un saut : un itinéraire de 3 jours sortait en 36 à 45 pages
    // presque vides, avec des liens à la géométrie aberrante. Le défaut ne se voyait qu'à la PREMIÈRE mesure d'un
    // texte (ensuite le cache répondait sans toucher au document), d'où un comportement en apparence aléatoire.
    // Corrigé au 7e audit (18/09/2026).
    const prevSize = doc._fontSize;
    const prevFont = doc._font;
    useFont(doc, font).fontSize(1000);
    try { unit = doc.widthOfString(str, { features: PDF_FEATURES }) / 1000; } catch(e){ unit = str.length * 0.5; }
    if(prevFont) doc._font = prevFont;
    doc.fontSize(prevSize || 12);
    if(cache.size > 20000) cache.clear();
    cache.set(key, unit);
  }
  return unit * size;
}

// Réordonnancement visuel des segments d'une ligne (règle L2 d'UAX #9, au niveau des segments).
function visualOrder(runs){
  if(!runs.length) return runs;
  const maxLevel = Math.max.apply(null, runs.map(r => r.level));
  const minOdd = Math.min.apply(null, runs.map(r => r.level).filter(l => l % 2 === 1).concat([maxLevel + 1]));
  const order = runs.slice();
  for(let lvl = maxLevel; lvl >= minOdd && lvl >= 1; lvl--){
    for(let i = 0; i < order.length;){
      if(order[i].level >= lvl){
        let j = i;
        while(j < order.length && order[j].level >= lvl) j++;
        const rev = order.slice(i, j).reverse();
        for(let k = i; k < j; k++) order[k] = rev[k - i];
        i = j;
      } else i++;
    }
  }
  return order;
}

// Caractères de contrôle retirés (sauf tabulation et saut de ligne).
function stripControls(s){
  return Array.from(s).filter(function(c){ const n = c.charCodeAt(0); return !(n < 9 || (n > 10 && n < 32) || n === 127); }).join('');
}
// Dessine un paragraphe. opts : x, y (défaut doc.y), width, size, bold, color, link, underline, lang, align ('left' |
// 'right' | 'center' ; défaut selon la langue), lineGap, maxLines, bottom + onPageBreak (bas de page et rappel de saut de
// page : sans eux, un long paragraphe s'écrivait SOUS le bas de page, définitivement perdu), deadline (horodatage
// performance.now() au-delà duquel le paragraphe est abandonné : voir le budget de mise en page dans server.js),
// measureOnly (12e audit du 19/09/2026 : hauteur calculée sans rien dessiner ni changer de page, ni toucher à doc.x/doc.y —
// fond d'une pastille de plusieurs lignes, dessiné AVANT son texte).
// Met doc.y sous la dernière ligne ; renvoie la hauteur.
function drawText(doc, str, opts){
  const text = stripControls(String(str == null ? '' : str).normalize('NFC'));
  const size = opts.size || 10;
  const x = opts.x, width = opts.width;
  const lang = opts.lang || 'fr';
  const rtlBase = opts.rtl != null ? !!opts.rtl : isRtlLang(lang);
  const align = opts.align || (rtlBase ? 'right' : 'left');
  const lineGap = opts.lineGap != null ? opts.lineGap : size * 0.25;
  let y = opts.y != null ? opts.y : doc.y;
  const startY = y;
  const paragraphs = text.split('\n');
  let linesDrawn = 0;
  for(const para of paragraphs){
    if(opts.maxLines && linesDrawn >= opts.maxLines) break;
    const fontsAt = assignFonts(para, lang);
    const levels = para ? bidi.getEmbeddingLevels(para, rtlBase ? 'rtl' : 'ltr').levels : [];
    const lines = breakLines(doc, para, fontsAt, lang, width, size, opts.bold);
    for(const [s, e0] of lines){
      if(opts.maxLines && linesDrawn >= opts.maxLines) break;
      if(opts.deadline && performance.now() > opts.deadline) break; // budget de mise en page épuisé
      let e = e0;
      while(e > s && /\s/.test(para[e - 1])) e--;
      // Segments (police, niveau) de la ligne
      const runs = [];
      for(let i = s; i < e;){
        let j = i + 1;
        while(j < e && fontsAt[j] === fontsAt[i] && levels[j] === levels[i]) j++;
        runs.push({ s: i, e: j, font: fontsAt[i], level: levels[i] });
        i = j;
      }
      const ordered = visualOrder(runs);
      let lineHeight = size * 1.2, ascent = size * 0.8;
      ordered.forEach(function(r){
        useFont(doc, fontKey(r.font, opts.bold)).fontSize(size);
        r.str = runText(para, r);
        r.width = safeWidth(doc, fontKey(r.font, opts.bold), r.str, size);
        r.ascent = doc._font.ascender / 1000 * size;
        ascent = Math.max(ascent, r.ascent);
        lineHeight = Math.max(lineHeight, doc.currentLineHeight(true));
      });
      // Ligne qui dépasserait le bas de page : page suivante (jamais deux sauts d'affilée pour une ligne plus haute que
      // la page elle-même).
      if(opts.measureOnly){ y += lineHeight + lineGap; linesDrawn++; continue; }
      if(opts.bottom && opts.onPageBreak && y + lineHeight > opts.bottom && y > doc.page.margins.top){
        y = opts.onPageBreak();
      }
      const lineWidth = ordered.reduce((t, r) => t + r.width, 0);
      let cx = align === 'right' ? x + width - lineWidth : align === 'center' ? x + (width - lineWidth) / 2 : x;
      const baseline = y + ascent;
      const lineX = cx;
      ordered.forEach(function(r){
        useFont(doc, fontKey(r.font, opts.bold)).fontSize(size);
        if(opts.color) doc.fillColor(opts.color);
        try {
          doc.text(r.str, cx, baseline - r.ascent, { lineBreak: false, features: PDF_FEATURES });
        } catch(err){ /* segment impossible à mettre en forme : ignoré plutôt que de faire échouer tout le document */ }
        cx += r.width;
      });
      // Lien et soulignement posés ici, sur toute la ligne : avec lineBreak:false, pdfkit calcule une largeur de lien NaN,
      // lève une erreur au milieu de l'annotation et le document ne se termine plus jamais (réponse HTTP sans fin).
      if(opts.link && lineWidth > 0){
        doc.link(lineX, y, lineWidth, lineHeight, opts.link);
        if(opts.underline){
          doc.save().lineWidth(size < 10 ? 0.5 : 0.8).strokeColor(opts.color || '#000000')
            .moveTo(lineX, baseline + size * 0.15).lineTo(lineX + lineWidth, baseline + size * 0.15).stroke().restore();
        }
      }
      y += lineHeight + lineGap;
      linesDrawn++;
    }
    if(!para.length){ y += size * 1.2 + lineGap; }
  }
  if(opts.measureOnly) return y - startY;
  doc.x = x;
  doc.y = y;
  return y - startY;
}
// fontkit rend un segment de droite à gauche (glyphes inversés) dès que sa PREMIÈRE lettre non neutre appartient à une
// écriture RTL — y compris des chiffres arabo-indiens « ۱۴۵ », qui doivent pourtant se lire de gauche à droite.
const FONTKIT_RTL_RE = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Thaana}\p{Script=Syriac}\p{Script=Nko}]/u;
const NEUTRAL_RE = /[\p{Script=Common}\p{Script=Inherited}\p{Script=Unknown}]/u;
function fontkitReverses(str){
  for(const ch of str){ if(!NEUTRAL_RE.test(ch)) return FONTKIT_RTL_RE.test(ch); }
  return false;
}
// Texte d'un segment à passer à pdfkit pour qu'il s'affiche dans l'ordre voulu par son niveau bidirectionnel : inversé
// (par graphèmes) quand fontkit ne l'inversera pas alors qu'il le faut, ou l'inversera alors qu'il ne le faut pas ;
// caractères miroirs (parenthèses…) remplacés dans les segments de droite à gauche inversés ici.
function runText(para, r){
  const str = para.slice(r.s, r.e);
  const rtl = r.level % 2 === 1;
  if(rtl === fontkitReverses(str)) return rtl ? mirrorChars(str) : str;
  const graphemes = Array.from(new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(str), g => g.segment).reverse();
  return (rtl ? graphemes.map(g => bidi.getMirroredCharacter(g) || g) : graphemes).join('');
}
function mirrorChars(str){
  return Array.from(str).map(c => bidi.getMirroredCharacter(c) || c).join('');
}

function breakLines(doc, text, fontsAt, lang, width, size, bold){
  const lines = [];
  if(!text) return lines;
  const atoms = atomsOf(text, lang);
  let lineStart = atoms.length ? atoms[0][0] : 0, lineW = 0;
  for(const [s, e] of atoms){
    const w = measure(doc, text, fontsAt, s, e, size, bold);
    // largeur sans les espaces finales de l'atome (elles peuvent déborder)
    let eTrim = e; while(eTrim > s && /\s/.test(text[eTrim - 1])) eTrim--;
    const wTrim = eTrim === e ? w : measure(doc, text, fontsAt, s, eTrim, size, bold);
    if(wTrim > width && lineW > 0){ lines.push([lineStart, s]); lineStart = s; lineW = 0; } // ligne fermée avant la coupe
    if(lineW + wTrim <= width || lineW === 0){
      if(lineW === 0 && wTrim > width){
        // Atome plus large que la ligne : coupé par graphèmes.
        let cs = s, cw = 0;
        for(const g of new Intl.Segmenter(lang || 'fr', { granularity: 'grapheme' }).segment(text.slice(s, e))){
          const gs = s + g.index, ge = gs + g.segment.length;
          const gw = measure(doc, text, fontsAt, gs, ge, size, bold);
          if(cw + gw > width && cw > 0){ lines.push([lineStart, gs]); lineStart = gs; cw = 0; }
          cw += gw;
        }
        lineW = cw;
        continue;
      }
      lineW += w;
    } else {
      lines.push([lineStart, s]);
      lineStart = s;
      lineW = w;
    }
  }
  lines.push([lineStart, text.length]);
  return lines;
}

// Largeur d'une ligne unique (jetons de statistiques).
function textWidth(doc, str, opts){
  // Mêmes nettoyages que drawText (caractères de contrôle, sauts de ligne) : sinon la largeur mesurée ne correspondait
  // pas au texte réellement dessiné.
  const text = stripControls(String(str == null ? '' : str).normalize('NFC')).split('\n')[0];
  const fontsAt = assignFonts(text, opts.lang);
  return measure(doc, text, fontsAt, 0, text.length, opts.size || 10, opts.bold);
}

// Tests : ordre visuel de chaque ligne tel qu'il sera affiché (segments inversés par fontkit compris).
function _visualLines(doc, str, opts){
  const text = String(str).normalize('NFC');
  const lang = opts.lang || 'fr';
  const fontsAt = assignFonts(text, lang);
  const levels = bidi.getEmbeddingLevels(text, isRtlLang(lang) ? 'rtl' : 'ltr').levels;
  return breakLines(doc, text, fontsAt, lang, opts.width, opts.size || 10, false).map(function(line){
    const s = line[0];
    let e = line[1];
    while(e > s && /\s/.test(text[e - 1])) e--;
    const runs = [];
    for(let i = s; i < e;){
      let j = i + 1;
      while(j < e && fontsAt[j] === fontsAt[i] && levels[j] === levels[i]) j++;
      runs.push({ s: i, e: j, level: levels[i] });
      i = j;
    }
    return visualOrder(runs).map(function(r){
      const t = runText(text, r);
      return fontkitReverses(t) ? Array.from(t).reverse().join('') : t;
    }).join('');
  });
}
// Démarrage : polices lues et un document de chaque écriture mis en page puis jeté (analyse des tables OpenType, compilation
// des fonctions chaudes) — le premier export d'un visiteur n'en porte plus le coût.
// Caches de glyphes de fontkit (font._glyphs) : partagés par tous les exports et jamais vidés, ils grossissaient de
// plusieurs centaines de Mo avec les polices CJK (11e audit du 19/09/2026 : +450 Mo après une quinzaine d'exports à
// idéogrammes nouveaux). Vidés au-delà de maxGlyphs par police ; fontkit les reconstruit à la demande.
function trimGlyphCaches(maxGlyphs){
  if(!fonts) return 0;
  let trimmed = 0;
  fonts.forEach(function(f){
    [f.font, f.boldFont].forEach(function(font){
      if(font && font._glyphs && Object.keys(font._glyphs).length > maxGlyphs){ font._glyphs = {}; trimmed++; }
    });
  });
  return trimmed;
}
// Caractère que la police à variante GRASSE incorporée séparément (NotoSans : latin, grec, cyrillique…) sait dessiner :
// écrit en gras et en maigre, il coûte deux glyphes à l'incorporation (12e audit du 19/09/2026, voir
// PDF_MAX_DISTINCT_CHARS dans server.js). Les autres écritures n'ont qu'une police : le gras y reprend les mêmes glyphes.
function hasBoldVariant(ch){
  const cp = String(ch).codePointAt(0);
  if(cp === undefined) return false;
  return loadFonts().some(f => f.boldFont && hasGlyph(f, cp));
}
function warmUp(){
  loadFonts();
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4' });
  doc.on('data', function(){});
  registerFonts(doc);
  ['Étape — 145 km', 'Этап', 'مرحلة ۱۴۵', 'שלב', 'पड़ाव', 'বিরতি', 'நிறுத்தம்', 'സ്റ്റോപ്പ്', 'නැවතුම', 'จุดแวะ', 'ຈຸດແວະ', 'ចំណត',
    'ခရီးစဉ်', 'გაჩერება', 'կանգառ', 'ማረፊያ', 'ހުއްޓުން', 'བར་བཞུགས།', 'ꀉꂿꃅ', '停靠点', '停靠點', '立ち寄り先', '경유지'].forEach(function(s, i){
    drawText(doc, s, { x: 50, y: 50 + i * 20, width: 400, lang: 'fr', bold: i === 0 });
  });
  doc.end();
}
module.exports = { registerFonts, drawText, textWidth, isRtlLang, loadFonts, warmUp, trimGlyphCaches, hasBoldVariant, _visualLines };
