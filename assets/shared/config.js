(() => {
    const defaultApi = 'https://bk-learnx-api.onrender.com';
    const savedApi = localStorage.getItem('bk_api_base') || '';
    const apiBase = (/^https?:\/\/localhost(?::\d+)?\/?$/i.test(savedApi) || /^https?:\/\/127\.0\.0\.1(?::\d+)?\/?$/i.test(savedApi) ? defaultApi : savedApi || defaultApi).replace(/\/$/, '');
  window.BK_CONFIG = Object.freeze({
    version: '1.2.0',
    API_BASE_URL: apiBase
  });
})();
