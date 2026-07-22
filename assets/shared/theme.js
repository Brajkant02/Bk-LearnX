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

        const toggleButton = document.querySelector('.theme-toggle');
        if (toggleButton) {
            toggleButton.textContent = nextTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
            toggleButton.setAttribute('aria-label', `Switch to ${nextTheme === 'dark' ? 'light' : 'dark'} mode`);
            toggleButton.setAttribute('data-theme-state', nextTheme);
        }
    }

    function toggleTheme(event) {
        if (event) {
            event.preventDefault();
        }

        const currentTheme = root.getAttribute('data-theme') || body.getAttribute('data-theme') || 'light';
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }

    const storedTheme = localStorage.getItem('bk-theme');
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(storedTheme || preferredTheme);

    const existingToggle = document.querySelector('.theme-toggle');
    if (existingToggle) {
        existingToggle.addEventListener('click', toggleTheme);
    }

    const clickableTargets = document.querySelectorAll('.brand img, .brand-img, [data-theme-toggle-image]');
    clickableTargets.forEach((element) => {
        element.style.cursor = 'pointer';
        element.title = 'Click to toggle dark/light mode';
        element.addEventListener('click', toggleTheme);
    });

    if (!existingToggle) {
        const host = document.querySelector('.navbar, .site-header, header');
        if (host) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'theme-toggle';
            button.setAttribute('aria-label', 'Toggle dark and light mode');
            button.textContent = root.getAttribute('data-theme') === 'dark' ? '☀️ Light' : '🌙 Dark';
            button.addEventListener('click', toggleTheme);
            host.appendChild(button);
        }
    }
});


