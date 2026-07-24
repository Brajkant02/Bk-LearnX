(() => {
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol === 'file:';
  const defaultApi = isLocal ? 'http://localhost:3000' : 'https://bk-learnx-api.onrender.com';
  const apiBase = (localStorage.getItem('bk_api_base') || defaultApi).replace(/\/$/, '');
  window.BK_CONFIG = Object.freeze({
    version: '1.2.0',
    API_BASE_URL: apiBase
  });
})();
