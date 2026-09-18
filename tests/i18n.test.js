// Traductions (public/js/i18n.js) et pages HTML : rapide (quelques secondes), sans moteur ni serveur.
//   - 161 langues, chacune avec TOUTES les clés du français, les mêmes {paramètres}, ni HTML ni guillemet double ;
//   - clés utilisées par app.js et theme.js présentes en français ;
//   - listes (LISTS) complètes dans chaque langue ;
//   - script inline des pages HTML : empreinte sha256 autorisée par la CSP de server.js, aucun gestionnaire on*.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public');

// Chargement de i18n.js dans un bac à sable (DOM factice), avec accès aux tables STRINGS et LISTS.
function loadI18n(){
  let src = fs.readFileSync(path.join(PUB, 'js', 'i18n.js'), 'utf8');
  const i = src.lastIndexOf('window.I18N = {');
  assert.ok(i > 0, 'window.I18N introuvable dans i18n.js');
  src = src.slice(0, i) + 'window.__S = STRINGS; window.__L = LISTS; ' + src.slice(i);
  const fakeEl = () => ({ setAttribute(){}, getAttribute(){ return null; }, classList: { add(){}, remove(){}, contains(){ return false; } }, appendChild(){}, addEventListener(){},
    querySelector(){ return fakeEl(); }, querySelectorAll(){ return []; }, style: {} });
  const ctx = { window: {}, navigator: { languages: ['fr'] }, localStorage: { getItem: () => null, setItem(){} },
    document: { readyState: 'complete', documentElement: fakeEl(), querySelectorAll: () => [], getElementById: () => null, createElement: fakeEl, addEventListener(){} },
    CustomEvent: function(){}, Intl, console };
  ctx.window.addEventListener = () => {}; ctx.window.dispatchEvent = () => {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { S: ctx.window.__S, L: ctx.window.__L, langs: Array.from(ctx.window.I18N.SUPPORTED) };
}
const { S, L, langs } = loadI18n();
const frKeys = Object.keys(S.fr);
const placeholders = s => (String(s).match(/\{(\w+)\}/g) || []).sort().join(',');
const report = (list, max) => list.length + ' problème(s) :\n  ' + list.slice(0, max || 25).join('\n  ') + (list.length > (max || 25) ? '\n  …' : '');

test('161 langues déclarées, chacune avec ses tables', () => {
  assert.equal(langs.length, 161);
  const missing = langs.filter(l => !S[l] || !L[l]);
  assert.deepEqual(missing, []);
});

test('toutes les clés du français présentes dans chaque langue, et aucune clé en plus', () => {
  const bad = [];
  for(const l of langs){
    const d = S[l] || {};
    const miss = frKeys.filter(k => d[k] === undefined);
    if(miss.length) bad.push(l + ' : ' + miss.length + ' clé(s) absente(s) (' + miss.slice(0, 5).join(', ') + ')');
    const extra = Object.keys(d).filter(k => S.fr[k] === undefined);
    if(extra.length) bad.push(l + ' : clé(s) hors français ' + extra.slice(0, 5).join(', '));
  }
  assert.equal(bad.length, 0, report(bad));
});

test('mêmes {paramètres} que le français, valeurs non vides', () => {
  const bad = [];
  for(const l of langs){
    for(const [k, v] of Object.entries(S[l] || {})){
      if(typeof v !== 'string'){ bad.push(l + ' ' + k + ' : valeur non textuelle'); continue; }
      if(!v.trim()) bad.push(l + ' ' + k + ' : valeur vide');
      if(S.fr[k] !== undefined && placeholders(v) !== placeholders(S.fr[k])) bad.push(l + ' ' + k + ' : paramètres [' + placeholders(v) + '] au lieu de [' + placeholders(S.fr[k]) + ']');
    }
  }
  assert.equal(bad.length, 0, report(bad));
});

test('ni HTML ni entité ni guillemet double dans les traductions', () => {
  const bad = [];
  for(const l of langs){
    for(const [k, v] of Object.entries(S[l] || {})){
      if(typeof v !== 'string') continue;
      if(/[<>]/.test(v) || /&[#a-z0-9]+;/i.test(v)) bad.push(l + ' ' + k + ' : HTML « ' + v.slice(0, 60) + ' »');
      if(/"/.test(v)) bad.push(l + ' ' + k + ' : guillemet double « ' + v.slice(0, 60) + ' »');
    }
  }
  assert.equal(bad.length, 0, report(bad));
});

test('listes (LISTS) complètes et valides dans chaque langue', () => {
  const bad = [];
  for(const l of langs){
    const dl = L[l] || {};
    for(const k of Object.keys(L.fr)){
      if(!Array.isArray(dl[k]) || !dl[k].length) bad.push(l + ' : liste absente ' + k);
      else if(dl[k].some(x => typeof x !== 'string' || !x.trim() || /[<>"]/.test(x))) bad.push(l + ' : élément invalide dans ' + k);
    }
  }
  assert.equal(bad.length, 0, report(bad));
});

test('clés utilisées par app.js et theme.js présentes en français', () => {
  const app = fs.readFileSync(path.join(PUB, 'js', 'app.js'), 'utf8');
  const theme = fs.readFileSync(path.join(PUB, 'js', 'theme.js'), 'utf8');
  const used = new Set();
  for(const m of app.matchAll(/\b(?:t|msg)\(\s*'([a-zA-Z]+\.[a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
  for(const m of app.matchAll(/'((?:error|reveal|export|photo|map|theme)\.[a-zA-Z0-9.]+)'/g)) used.add(m[1]);
  for(const m of theme.matchAll(/'(theme\.[a-zA-Z]+)'/g)) used.add(m[1]);
  assert.ok(used.size > 50, 'extraction des clés utilisées : ' + used.size + ' seulement');
  // Préfixe dynamique (« t('form.budget.' + clé) ») : au moins une clé française doit commencer ainsi.
  const missing = [...used].filter(k => k.endsWith('.') ? !frKeys.some(f => f.startsWith(k)) : S.fr[k] === undefined);
  assert.deepEqual(missing, []);
  assert.ok(!/\beval\(|new Function\(/.test(app), 'eval ou new Function dans app.js');
});

test('pages HTML : script inline autorisé par son empreinte dans la CSP de server.js, aucun gestionnaire on*', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const allowed = new Set([...server.matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map(m => m[1]));
  assert.ok(allowed.size >= 1, 'aucune empreinte sha256 dans la CSP de server.js');
  const bad = [];
  for(const f of fs.readdirSync(PUB).filter(f => f.endsWith('.html'))){
    const h = fs.readFileSync(path.join(PUB, f), 'utf8');
    for(const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)){
      const hash = crypto.createHash('sha256').update(m[1], 'utf8').digest('base64');
      if(!allowed.has(hash)) bad.push(f + ' : script inline d\'empreinte sha256-' + hash + ' absente de la CSP');
    }
    // Scripts inline avec attributs (hors données JSON-LD) : jamais autorisés par la CSP.
    for(const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
      if(m[1].trim() && !/\bsrc=/.test(m[1]) && !/application\/ld\+json/.test(m[1]) && m[2].trim()) bad.push(f + ' : script inline <script' + m[1] + '>');
    }
    if(/\son[a-z]+\s*=/i.test(h.replace(/<script[\s\S]*?<\/script>/g, ''))) bad.push(f + ' : gestionnaire d\'événement on* inline');
  }
  assert.deepEqual(bad, []);
});
