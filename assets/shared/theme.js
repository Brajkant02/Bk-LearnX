document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const body = document.body;

    function normalizeTheme(theme) {
        return theme === 'dark' ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        const nextTheme = normalizeTheme(theme);
        root.setAttribute('data-theme', nextTheme);
        body.setAttribute('data-theme', nextTheme);
        localStorage.setItem('bk-theme', nextTheme);
    }

    const storedTheme = localStorage.getItem('bk-theme');
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(storedTheme || preferredTheme);
});


