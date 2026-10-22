/** Session flag: the preloader runs once per tab session. */
export const PRELOADED_KEY = "scyte.preloaded";

/**
 * Inline script for <head>. Decides before first paint whether the preloader runs,
 * so repeat visits never flash it. Without JavaScript the preloader never shows.
 */
export const preloaderBootScript = `(function(){var d=document.documentElement;d.classList.add('js');try{if(sessionStorage.getItem('${PRELOADED_KEY}')){d.dataset.preloaded='1'}else{d.classList.add('is-preloading')}}catch(e){d.dataset.preloaded='1'}})();`;
