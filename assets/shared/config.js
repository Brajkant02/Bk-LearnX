(() => {
    const defaultApi = 'https://bk-learnx-api.onrender.com';
    const savedApi = localStorage.getItem('bk_api_base') || '';
  const isLocalPage = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const localApi = 'http://localhost:3000';
  const apiBase = (savedApi || (isLocalPage ? localApi : defaultApi)).replace(/\/$/, '');
  window.BK_CONFIG = Object.freeze({
    version: '1.2.0',
    API_BASE_URL: apiBase
  });
})();
