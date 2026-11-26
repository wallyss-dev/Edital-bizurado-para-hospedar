
/* Edital Bizurado — página de assinatura */

(function () {
  'use strict';

  const STORAGE_THEME = 'edital_bizurado_tema_v1';

  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  /* Carrega a preferência de tema */

  function loadTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_THEME);

      if (saved === 'light' || saved === 'dark') {
        root.setAttribute('data-theme', saved);
      }
    } catch (_) {
      // Sem acesso ao localStorage.
    }
  }

  /* Identifica o tema atual */

  function isDarkTheme() {
    const theme = root.getAttribute('data-theme');

    if (theme === 'dark') return true;
    if (theme === 'light') return false;

    return window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
  }

  /* Atualiza o texto do botão */

  function updateThemeButton() {
    if (!themeToggle) return;

    themeToggle.textContent = isDarkTheme()
      ? 'Tema claro'
      : 'Tema escuro';
  }

  /* Alterna e salva o tema */

  function toggleTheme() {
    const theme = isDarkTheme() ? 'light' : 'dark';

    root.setAttribute('data-theme', theme);

    try {
      localStorage.setItem(STORAGE_THEME, theme);
    } catch (_) {
      // Ignora erro de gravação.
    }

    updateThemeButton();
  }

  /* Inicialização */

  loadTheme();
  updateThemeButton();

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  /* Atualiza o tema ao retornar à página */

  window.addEventListener('pageshow', function () {
    loadTheme();
    updateThemeButton();
  });

})();
