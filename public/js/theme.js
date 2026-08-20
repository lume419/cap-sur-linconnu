// Bascule clair/sombre/automatique, partagée par les trois pages du site (index, mentions légales,
// politique de confidentialité) — indépendante de app.js, qui n'est chargé que sur la page d'accueil.
// Le CSS (voir style.css : :root, @media (prefers-color-scheme:dark), :root[data-theme="dark"])
// gère déjà les trois cas ; ce script ne fait que poser/retirer l'attribut data-theme sur <html> et
// mémoriser le choix. "Automatique" (par défaut) retire l'attribut : c'est alors la préférence du
// système d'exploitation/navigateur qui décide, via la media query CSS — rien à faire ici.
// Un script identique et minimal, exécuté de façon synchrone dans le <head> de chaque page avant le
// chargement de la feuille de style, applique déjà le choix mémorisé pour éviter un flash du mauvais
// thème au chargement ; ce fichier-ci (chargé en `defer`) n'a donc plus qu'à brancher les boutons.
(function(){
  var STORAGE_KEY = 'theme';

  function currentChoice(){
    try {
      var t = localStorage.getItem(STORAGE_KEY);
      if(t === 'light' || t === 'dark') return t;
    } catch(e){ /* stockage indisponible (navigation privée stricte...) : on retombe sur "auto" */ }
    return 'auto';
  }

  function apply(choice){
    if(choice === 'light' || choice === 'dark'){
      document.documentElement.setAttribute('data-theme', choice);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    var buttons = document.querySelectorAll('.theme-toggle button');
    for(var i = 0; i < buttons.length; i++){
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-theme-choice') === choice));
    }
  }

  function init(){
    apply(currentChoice());
    var buttons = document.querySelectorAll('.theme-toggle button');
    for(var i = 0; i < buttons.length; i++){
      buttons[i].addEventListener('click', function(){
        var choice = this.getAttribute('data-theme-choice');
        try {
          if(choice === 'auto') localStorage.removeItem(STORAGE_KEY);
          else localStorage.setItem(STORAGE_KEY, choice);
        } catch(e){ /* pas grave : le choix s'appliquera pour cette page, juste pas mémorisé */ }
        apply(choice);
      });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
