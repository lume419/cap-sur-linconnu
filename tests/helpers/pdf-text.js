// Extraction minimale du texte d'un PDF produit par pdfkit (flux FlateDecode, polices avec table ToUnicode), sans
// dépendance : suffit à vérifier la présence d'un texte (pied de page, mention « tronqué »…) dans un export.
'use strict';
const zlib = require('zlib');

function parseObjects(buf){
  const s = buf.toString('latin1');
  const objs = new Map();
  const re = /(\d+) 0 obj\s*([\s\S]*?)endobj/g;
  let m;
  while((m = re.exec(s))){
    const body = m[2];
    const si = body.indexOf('stream');
    let dict = body, stream = null;
    if(si >= 0){
      dict = body.slice(0, si);
      let start = si + 6;
      if(body[start] === '\r') start++;
      if(body[start] === '\n') start++;
      const end = body.lastIndexOf('endstream');
      const raw = Buffer.from(body.slice(start, end), 'latin1');
      try { stream = /FlateDecode/.test(dict) ? zlib.inflateSync(raw) : raw; } catch(e){ stream = null; }
    }
    objs.set(+m[1], { dict, stream });
  }
  return objs;
}

// Table ToUnicode : code (hexadécimal) -> texte. Les cibles peuvent contenir des espaces (ligature « fi » :
// <0066 0069>) et peuvent être VIDES : « <> » est la cible d'un glyphe sans valeur Unicode, que la composition
// OpenType produit couramment (turc, azéri, gagaouze, tatar de Crimée, karakalpak, vietnamien, venda, touroyo…).
// D'où « [0-9a-fA-F\s]* » et non « + » (17e audit du 20/09/2026) : avec « + », une cible vide n'était pas
// reconnue comme une entrée du tableau d'un beginbfrange, TOUTES les suivantes étaient décalées d'un cran et le
// texte rendu était faux — « CpenItreetṋap » au lieu de « OpenStreetMap ». Le pied de page des exports ne
// pouvait donc pas être contrôlé dans ces langues.
function parseCMap(txt){
  const map = new Map();
  const hexToStr = h0 => { const h = h0.replace(/\s+/g, ''); let out = ''; for(let i = 0; i + 4 <= h.length; i += 4) out += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); return out; };
  for(const blk of txt.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)){
    for(const m of blk[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F\s]*)>/g)) map.set(m[1].toLowerCase(), hexToStr(m[2]));
  }
  for(const blk of txt.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)){
    for(const m of blk[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F\s]*>)/g)){
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16), w = m[1].length;
      if(m[3][0] === '['){
        const arr = [...m[3].matchAll(/<([0-9a-fA-F\s]*)>/g)].map(x => x[1]);
        for(let c = lo; c <= hi && c - lo < arr.length; c++) map.set(c.toString(16).padStart(w, '0'), hexToStr(arr[c - lo]));
      } else {
        const base = m[3].slice(1, -1).replace(/\s+/g, '');
        const first = parseInt(base.slice(-4), 16);
        for(let c = lo; c <= hi; c++) map.set(c.toString(16).padStart(w, '0'), hexToStr(base.slice(0, -4)) + String.fromCharCode(first + c - lo));
      }
    }
  }
  return map;
}

// Texte de toutes les pages, dans l'ordre des flux de contenu (une ligne par opérateur de texte).
function pdfText(buf){
  const objs = parseObjects(buf);
  // Nom de ressource de police (/F1…) -> table ToUnicode
  const fontMap = new Map();
  for(const [, o] of objs){
    for(const m of o.dict.matchAll(/\/(F\d+)\s+(\d+) 0 R/g)){
      const font = objs.get(+m[2]);
      if(!font) continue;
      const tu = /\/ToUnicode\s+(\d+) 0 R/.exec(font.dict);
      if(tu && objs.get(+tu[1]) && objs.get(+tu[1]).stream) fontMap.set(m[1], parseCMap(objs.get(+tu[1]).stream.toString('latin1')));
    }
  }
  const lines = [];
  for(const [, o] of objs){
    if(!o.stream || /\/(Length1|Subtype\s*\/(Image|Type0|CIDFontType)|Type\s*\/(XObject|Metadata))/.test(o.dict)) continue;
    const s = o.stream.toString('latin1');
    if(!/\bT[Jj]\b/.test(s)) continue;
    let cmap = null;
    const re = /\/(F\d+)\s+[\d.]+\s+Tf|\[((?:[^\]])*)\]\s*TJ|<([0-9a-fA-F]+)>\s*Tj/g;
    let m;
    while((m = re.exec(s))){
      if(m[1]){ cmap = fontMap.get(m[1]) || null; continue; }
      const hexes = m[2] !== undefined ? [...m[2].matchAll(/<([0-9a-fA-F]*)>/g)].map(x => x[1]) : [m[3]];
      let line = '';
      for(const h of hexes){
        for(let i = 0; i + 4 <= h.length; i += 4){
          const code = h.slice(i, i + 4).toLowerCase();
          line += cmap && cmap.has(code) ? cmap.get(code) : '';
        }
      }
      lines.push(line);
    }
  }
  return lines.join('\n');
}

function pageCount(buf){ return (buf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length; }
function isCompletePdf(buf){ const s = buf.slice(0, 8).toString('latin1'); return s.startsWith('%PDF-') && buf.slice(-64).toString('latin1').includes('%%EOF'); }

module.exports = { pdfText, pageCount, isCompletePdf };
