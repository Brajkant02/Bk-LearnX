(() => {
    const API = (window.BK_CONFIG?.API_BASE_URL || localStorage.getItem('bk_api_base') || 'http://localhost:3000').replace(/\/$/, '');
    const getUser = () => { try { return JSON.parse(localStorage.getItem('bk_user') || 'null') } catch { return null } };
    const getToken = () => localStorage.getItem('bk_token') || '';
    const api = async (path, options = {}) => { const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }; if (getToken()) headers.Authorization = `Bearer ${getToken()}`; const r = await fetch(API + path, { ...options, headers }); let data = {}; try { data = await r.json() } catch { } if (!r.ok) throw new Error(data.message || 'Request failed'); return data };
    const track = (type, extra = {}) => { if (!getToken()) return; const payload = JSON.stringify({ type, page: location.pathname, title: document.title, ...extra }); fetch(API + '/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: payload, keepalive: true }).catch(() => { }) };
    const logout = async () => { try { await api('/api/logout', { method: 'POST' }) } catch { } localStorage.removeItem('bk_user'); localStorage.removeItem('bk_token'); location.href = (document.body.dataset.loginUrl || '/pages/auth/login/index.html') };
    window.BK = { API, getUser, getToken, api, track, logout };
    document.addEventListener('DOMContentLoaded', () => { const user = getUser(); document.querySelectorAll('[data-auth-only]').forEach(x => x.hidden = !user); document.querySelectorAll('[data-guest-only]').forEach(x => x.hidden = !!user); document.querySelectorAll('[data-user-name]').forEach(x => x.textContent = user?.name || 'Student'); document.querySelectorAll('[data-logout]').forEach(x => x.addEventListener('click', logout)); track('page_view'); });
    let started = Date.now(); window.addEventListener('beforeunload', () => track('page_leave', { durationSeconds: Math.round((Date.now() - started) / 1000) }));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') track('page_hidden', { durationSeconds: Math.round((Date.now() - started) / 1000) }); else { started = Date.now(); track('page_visible') } });
})();
