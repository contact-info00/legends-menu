/**
 * Inline script for root layout: applies last-known appBg from localStorage only.
 * Network theme loading is handled once by ThemeProvider (or server-injected data).
 */
export function getThemeLocalStorageBootstrapScript(): string {
  return `
    (function() {
      try {
        var pathParts = window.location.pathname.split('/').filter(Boolean);
        var slug = pathParts.length > 0 && pathParts[0] !== 'super-admin' && pathParts[0] !== 'admin'
          ? pathParts[0]
          : 'legends-restaurant';
        var cachedTheme = localStorage.getItem('theme-appBg-' + slug);
        if (!cachedTheme) return;
        document.documentElement.style.setProperty('--app-bg', cachedTheme);
        document.body.style.backgroundColor = cachedTheme;
        document.documentElement.style.backgroundColor = cachedTheme;
      } catch (e) {}
    })();
  `
}
