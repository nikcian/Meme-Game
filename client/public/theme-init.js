(function () {
  let theme = 'light';
  try {
    const stored = localStorage.getItem('memegame:theme');
    if (stored === 'light' || stored === 'dark') theme = stored;
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
  } catch {
    // localStorage non disponibile (es. modalità privata restrittiva): tema chiaro.
  }
  document.documentElement.dataset.theme = theme;
})();
