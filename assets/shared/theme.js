document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const body = document.body;
    const logoImage = document.querySelector('brand-img');

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        body.setAttribute('data-theme', theme);
        localStorage.setItem('bk-theme', theme);
    }

    function toggleTheme(event) {
        event.preventDefault();

        const currentTheme = root.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

        applyTheme(nextTheme);
    }

    const storedTheme = localStorage.getItem('bk-theme');
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    applyTheme(storedTheme || preferredTheme);

    if (logoImage) {
        logoImage.style.cursor = 'pointer';
        logoImage.title = 'click-to-toggle-dark/light-mode';
        logoImage.addEventListener('click', toggleTheme);
    }
});


