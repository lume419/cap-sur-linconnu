// Bascule clair/sombre/automatique, partagée par les trois pages du site (index, mentions légales,
// politique de confidentialité) — indépendante de app.js, qui n'est chargé que sur la page d'accueil.
// Un seul bouton : chaque clic fait tourner auto -> clair -> sombre -> auto..., l'icône et le
// libellé affichés reflètent l'état ACTUEL (pas le prochain). Le CSS (voir style.css : :root,
// @media (prefers-color-scheme:dark), :root[data-theme="dark"]) gère déjà les trois cas ; ce script
// ne fait que poser/retirer l'attribut data-theme sur <html> et mémoriser le choix. "Automatique"
// (par défaut) retire l'attribut : c'est alors la préférence du système qui décide, via la media
// query CSS — rien à faire ici. Un script identique et minimal, exécuté de façon synchrone dans le
// <head> de chaque page avant le chargement de la feuille de style, applique déjà le choix
// mémorisé pour éviter un flash du mauvais thème au chargement ; ce fichier-ci (chargé en `defer`)
// n'a donc plus qu'à brancher le bouton.
(function(){
  var STORAGE_KEY = 'theme';
  var ORDER = ['auto', 'light', 'dark'];
  var META = {
    auto:  { label: 'Auto',   icon: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18V3z" fill="currentColor" stroke="none"/>' },
    light: { label: 'Clair',  icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>' },
    dark:  { label: 'Sombre', icon: '<path d="M20.5 14.4A8.5 8.5 0 1 1 9.6 3.5a7 7 0 0 0 10.9 10.9z" fill="currentColor" stroke="none"/>' }
  };

  function currentChoice(){
    try {
      var t = localStorage.getItem(STORAGE_KEY);
      if(t === 'light' || t === 'dark') return t;
    } catch(e){ /* stockage indisponible (navigation privée stricte...) : on retombe sur "auto" */ }
    return 'auto';
  }

  function render(btn, choice){
    var m = META[choice];
    btn.setAttribute('data-theme-current', choice);
    var icon = btn.querySelector('.theme-toggle-icon');
    var label = btn.querySelector('.theme-toggle-label');
    if(icon) icon.innerHTML = m.icon;
    if(label) label.textContent = m.label;
  }

  function apply(choice){
    if(choice === 'light' || choice === 'dark'){
      document.documentElement.setAttribute('data-theme', choice);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    var buttons = document.querySelectorAll('.theme-toggle-btn');
    for(var i = 0; i < buttons.length; i++) render(buttons[i], choice);
  }

  function init(){
    apply(currentChoice());
    var buttons = document.querySelectorAll('.theme-toggle-btn');
    for(var i = 0; i < buttons.length; i++){
      buttons[i].addEventListener('click', function(){
        var current = this.getAttribute('data-theme-current') || 'auto';
        var next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
        try {
          if(next === 'auto') localStorage.removeItem(STORAGE_KEY);
          else localStorage.setItem(STORAGE_KEY, next);
        } catch(e){ /* pas grave : le choix s'appliquera pour cette page, juste pas mémorisé */ }
        apply(next);
      });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
