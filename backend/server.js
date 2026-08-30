require('dotenv').config();
const express = require('express'), cors = require('cors'), bcrypt = require('bcryptjs'), fs = require('fs').promises, path = require('path'), crypto = require('crypto'), nodemailer = require('nodemailer');
const app = express(), PORT = process.env.PORT || 3000, DATA = path.join(__dirname, 'data'); app.use(cors()); app.use(express.json({ limit: '3mb' }));
const files = { users: 'users.json', activity: 'activity.json', progress: 'progress.json' }; const sessions = new Map(), adminSessions = new Map(), oauthStates = new Map();
const LEARNING_CONFIG = Object.freeze({
  inactivityTimeoutSeconds: Number(process.env.LEARNING_INACTIVITY_TIMEOUT || 45),
  heartbeatIntervalSeconds: Number(process.env.LEARNING_HEARTBEAT_INTERVAL || 30),
  minimumActiveTimeSeconds: Number(process.env.LEARNING_MIN_ACTIVE_SECONDS || 300),
  minimumReadProgress: Number(process.env.LEARNING_MIN_READ_PROGRESS || 90),
  minimumSectionsViewed: Number(process.env.LEARNING_MIN_SECTIONS_VIEWED || 90),
  requireQuizIfAvailable: String(process.env.LEARNING_REQUIRE_QUIZ || 'true') !== 'false'
});
async function read(k) { try { return JSON.parse(await fs.readFile(path.join(DATA, files[k]), 'utf8')) } catch { return [] } } async function write(k, v) { await fs.mkdir(DATA, { recursive: true }); await fs.writeFile(path.join(DATA, files[k]), JSON.stringify(v, null, 2)) } const token = () => crypto.randomBytes(24).toString('hex');
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
function createOAuthState(provider, redirectUrl) { const state = crypto.randomBytes(16).toString('hex'); oauthStates.set(state, { provider, redirectUrl, createdAt: Date.now() }); return state; }
function consumeOAuthState(state) { const entry = oauthStates.get(state); if (entry) oauthStates.delete(state); return entry; }
async function auth(req, res, next) { const t = (req.headers.authorization || '').replace('Bearer ', ''); const s = sessions.get(t); if (!s || Date.now() - s.loginAt > SESSION_TTL) { sessions.delete(t); return res.status(401).json({ message: 'Please login again.' }); } s.lastSeen = Date.now(); req.userId = s.userId; req.sessionToken = t; next() }
function admin(req, res, next) { const t = req.header('x-admin-token'); if (!adminSessions.has(t)) return res.status(401).json({ message: 'Unauthorized' }); next() }
app.get('/api/health', (q, r) => r.json({ status: 'ok' }));
app.get('/api/auth/google', (req, res) => {
  const fallbackRedirect = process.env.FRONTEND_URL || 'http://localhost:3000/pages/auth/login/index.html';
  const requestedRedirect = typeof req.query.redirect === 'string' && req.query.redirect.trim() ? req.query.redirect : fallbackRedirect;
  const redirectTarget = new URL(requestedRedirect, `${req.protocol}://${req.get('host')}`); const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    redirectTarget.searchParams.set('google_error', 'Google login is not configured on this server yet.');
    return res.redirect(redirectTarget.toString());
  }
  const state = createOAuthState('google', redirectTarget.toString());
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const fallbackRedirect = process.env.FRONTEND_URL || 'http://localhost:3000/pages/auth/login/index.html';
  const errorTarget = new URL(fallbackRedirect, `${req.protocol}://${req.get('host')}`);
  if (error) {
    errorTarget.searchParams.set('google_error', 'Google sign-in was cancelled or failed.');
    return res.redirect(errorTarget.toString());
  }
  if (!code || !state) {
    errorTarget.searchParams.set('google_error', 'Google sign-in response was incomplete.');
    return res.redirect(errorTarget.toString());
  }
  const savedState = consumeOAuthState(String(state));
  if (!savedState) {
    errorTarget.searchParams.set('google_error', 'Google sign-in state expired. Please try again.');
    return res.redirect(errorTarget.toString());
  }
  const redirectTarget = new URL(savedState.redirectUrl, `${req.protocol}://${req.get('host')}`);
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Google code.');
    }
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileResponse.json();
    if (!profile.email) {
      throw new Error('Google profile did not return an email address.');
    }
    const users = await read('users');
    const email = String(profile.email).trim().toLowerCase();
    let user = users.find(x => (x.email || '').toLowerCase() === email);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        name: profile.name || profile.given_name || email.split('@')[0],
        email,
        branch: '',
        semester: '',
        passwordHash: '',
        registeredAt: new Date().toISOString(),
        lastLoginAt: null,
        lastLogoutAt: null,
        phone: '',
        college: '',
        photo: profile.picture || '',
        provider: 'google'
      };
      users.push(user);
    } else {
      user.name = user.name || profile.name || profile.given_name || email.split('@')[0];
      user.photo = user.photo || profile.picture || '';
      user.provider = 'google';
    }
    user.lastLoginAt = new Date().toISOString();
    await write('users', users);
    const sessionToken = token();
    sessions.set(sessionToken, { userId: user.id, loginAt: Date.now(), lastSeen: Date.now(), currentPage: '' });
    redirectTarget.searchParams.set('google_auth', '1');
    redirectTarget.searchParams.set('token', sessionToken);
    redirectTarget.searchParams.set('user', encodeURIComponent(JSON.stringify(safe(user))));
    res.redirect(redirectTarget.toString());
  } catch (error) {
    console.error('Google OAuth error:', error.message || error);
    redirectTarget.searchParams.set('google_error', 'Unable to sign in with Google right now.');
    res.redirect(redirectTarget.toString());
  }
});
app.get('/api/auth/facebook', (req, res) => {
  const target = new URL(req.query.redirect || process.env.FRONTEND_URL || 'http://localhost:3000/pages/auth/login/index.html', `${req.protocol}://${req.get('host')}`);
  if (!process.env.FACEBOOK_CLIENT_ID || !process.env.FACEBOOK_CLIENT_SECRET) { target.searchParams.set('oauth_error', 'Facebook login is not configured on this server yet.'); return res.redirect(target.toString()); }
  const state = createOAuthState('facebook', target.toString()); const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;
  const params = new URLSearchParams({ client_id: process.env.FACEBOOK_CLIENT_ID, redirect_uri: redirectUri, state, response_type: 'code', scope: 'email,public_profile' });
  res.redirect(`https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`);
});
app.get('/api/auth/facebook/callback', async (req, res) => {
  const saved = consumeOAuthState(String(req.query.state || '')); const target = new URL(saved?.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:3000/pages/auth/login/index.html', `${req.protocol}://${req.get('host')}`);
  try {
    if (!saved || !req.query.code) throw new Error('Social sign-in response was incomplete.');
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;
    const exchange = await fetch('https://graph.facebook.com/v20.0/oauth/access_token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.FACEBOOK_CLIENT_ID || '', client_secret: process.env.FACEBOOK_CLIENT_SECRET || '', redirect_uri: redirectUri, code: String(req.query.code) }) });
    const access = await exchange.json(); if (!access.access_token) throw new Error('Facebook token exchange failed.');
    const profile = await (await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${encodeURIComponent(access.access_token)}`)).json(); if (!profile.email) throw new Error('Facebook email permission is required.');
    const users = await read('users'); const email = profile.email.trim().toLowerCase(); let user = users.find(x => (x.email || '').toLowerCase() === email);
    if (!user) { user = { id: crypto.randomUUID(), name: profile.name || email.split('@')[0], email, branch: '', semester: '', passwordHash: '', registeredAt: new Date().toISOString(), lastLoginAt: null, lastLogoutAt: null, phone: '', college: '', photo: profile.picture?.data?.url || '', provider: 'facebook' }; users.push(user); } else { user.provider = 'facebook'; user.photo = user.photo || profile.picture?.data?.url || ''; }
    user.lastLoginAt = new Date().toISOString(); await write('users', users); const sessionToken = token(); sessions.set(sessionToken, { userId: user.id, loginAt: Date.now(), lastSeen: Date.now(), currentPage: '' }); target.searchParams.set('oauth_auth', '1'); target.searchParams.set('token', sessionToken); target.searchParams.set('user', encodeURIComponent(JSON.stringify(safe(user)))); res.redirect(target.toString());
  } catch (error) { target.searchParams.set('oauth_error', error.message || 'Unable to sign in with Facebook.'); res.redirect(target.toString()); }
});
app.post('/api/register', async (req, res) => { const { name, email, branch, semester, password, confirmPassword } = req.body; if (!name || !email || !branch || !semester || !password) return res.status(400).json({ message: 'All fields required.' }); if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' }); const users = await read('users'); if (users.some(x => (x.email || '').toLowerCase() === email.toLowerCase())) return res.status(409).json({ message: 'Email already registered.' }); const u = { id: crypto.randomUUID(), name: name.trim(), email: email.trim().toLowerCase(), branch, semester, passwordHash: await bcrypt.hash(password, 10), registeredAt: new Date().toISOString(), lastLoginAt: null, lastLogoutAt: null, phone: '', college: '', photo: '', provider: 'password' }; users.push(u); await write('users', users); res.status(201).json({ message: 'Registration successful.' }) });
app.post('/api/login', async (req, res) => {
  const users = await read('users');
  const u = users.find(x => (x.email || '').toLowerCase() === (req.body.email || '').trim().toLowerCase());
  const password = String(req.body.password || '');
  const isBcrypt = typeof u?.passwordHash === 'string' && u.passwordHash.startsWith('$2');
  const validPassword = isBcrypt ? await bcrypt.compare(password, u.passwordHash) : u?.passwordHash === password;
  if (!u || !validPassword) return res.status(401).json({ message: 'Invalid email or password.' });
  if (!isBcrypt) u.passwordHash = await bcrypt.hash(password, 10);
  u.provider = 'password';
  u.lastLoginAt = new Date().toISOString();
  await write('users', users);
  const t = token(); sessions.set(t, { userId: u.id, loginAt: Date.now(), lastSeen: Date.now(), currentPage: '' });
  res.json({ token: t, user: safe(u) });
});
const otpHash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
function mailTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
    });
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
  });
}

app.post('/api/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    return res.status(500).json({ message: 'Email service configure nahi hai. Render environment variables check karein.' });
  }

  const users = await read('users');
  const u = users.find(x => (x.email || '').toLowerCase() === email);
  if (!u) return res.status(404).json({ message: 'Ye email BK LearnX par registered nahi hai.' });

  const code = String(crypto.randomInt(100000, 1000000));
  u.passwordResetOtpHash = otpHash(code);
  u.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  u.passwordResetOtpAttempts = 0;
  delete u.resetToken;
  delete u.resetExpiresAt;
  await write('users', users);

  try {
    await mailTransport().sendMail({
      from: `BK LearnX <${process.env.EMAIL_USER}>`,
      to: u.email,
      subject: 'BK LearnX password reset code',
      text: `Your BK LearnX password reset code is ${code}. It expires in 10 minutes.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px"><h2 style="color:#173b7a">BK LearnX</h2><p>Password reset karne ke liye ye verification code use karein:</p><div style="font-size:34px;font-weight:700;letter-spacing:8px;padding:18px;text-align:center;background:#f3f6fb;border-radius:10px">${code}</div><p style="color:#555">Code 10 minutes tak valid hai. Agar aapne request nahi ki, ise ignore karein.</p></div>`
    });
    res.json({ message: '6-digit verification code aapke email par bhej diya gaya hai.', email: u.email });
  } catch (error) {
    delete u.passwordResetOtpHash;
    delete u.passwordResetOtpExpiresAt;
    delete u.passwordResetOtpAttempts;
    await write('users', users);
    console.error('Password reset email error:', error.message);
    res.status(500).json({ message: 'Verification code email par nahi bheja ja saka. Email configuration check karein.' });
  }
});

app.post('/api/verify-reset-code', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Valid email aur 6-digit code enter karein.' });

  const users = await read('users');
  const u = users.find(x => (x.email || '').toLowerCase() === email);
  if (!u || !u.passwordResetOtpHash) return res.status(400).json({ message: 'Pehle naya verification code request karein.' });
  if (!u.passwordResetOtpExpiresAt || Date.now() > new Date(u.passwordResetOtpExpiresAt).getTime()) {
    delete u.passwordResetOtpHash; delete u.passwordResetOtpExpiresAt; delete u.passwordResetOtpAttempts;
    await write('users', users);
    return res.status(400).json({ message: 'Verification code expire ho gaya. Naya code mangayein.' });
  }

  u.passwordResetOtpAttempts = Number(u.passwordResetOtpAttempts || 0) + 1;
  if (u.passwordResetOtpAttempts > 5) {
    delete u.passwordResetOtpHash; delete u.passwordResetOtpExpiresAt; delete u.passwordResetOtpAttempts;
    await write('users', users);
    return res.status(429).json({ message: 'Bahut zyada galat attempts. Naya code request karein.' });
  }
  if (otpHash(code) !== u.passwordResetOtpHash) {
    await write('users', users);
    return res.status(400).json({ message: 'Verification code galat hai.' });
  }

  u.resetToken = token();
  u.resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  delete u.passwordResetOtpHash;
  delete u.passwordResetOtpExpiresAt;
  delete u.passwordResetOtpAttempts;
  await write('users', users);
  res.json({ message: 'Email verified. Ab naya password set karein.', resetToken: u.resetToken });
});

app.post('/api/reset-password', async (req, res) => {
  const { token: resetToken, password } = req.body;
  if (!resetToken || !password) return res.status(400).json({ message: 'Verification required.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password kam se kam 8 characters ka hona chahiye.' });
  const users = await read('users');
  const u = users.find(x => x.resetToken === resetToken);
  if (!u) return res.status(400).json({ message: 'Invalid reset session. Code dobara verify karein.' });
  if (!u.resetExpiresAt || Date.now() > new Date(u.resetExpiresAt).getTime()) return res.status(400).json({ message: 'Reset session expire ho gaya. Dobara code mangayein.' });
  u.passwordHash = await bcrypt.hash(password, 10);
  delete u.resetToken;
  delete u.resetExpiresAt;
  await write('users', users);
  for (const [sessionToken, session] of sessions) if (session.userId === u.id) sessions.delete(sessionToken);
  res.json({ message: 'Password successfully update ho gaya.' });
});

app.post('/api/logout', auth, async (req, res) => { const users = await read('users'), u = users.find(x => x.id === req.userId); if (u) { u.lastLogoutAt = new Date().toISOString(); await write('users', users) } sessions.delete(req.sessionToken); res.json({ message: 'Logged out' }) });
const safe = u => { const { passwordHash, ...x } = u; return x };
app.get('/api/me', auth, async (req, res) => { const u = (await read('users')).find(x => x.id === req.userId); if (!u) return res.status(404).json({ message: 'Student profile not found.' }); res.json({ user: safe(u) }) });
app.put('/api/me', auth, async (req, res) => { const users = await read('users'), u = users.find(x => x.id === req.userId); if (!u) return res.status(404).json({ message: 'Student profile not found.' });['name', 'branch', 'semester', 'phone', 'college', 'photo'].forEach(k => { if (req.body[k] !== undefined) u[k] = String(req.body[k]).trim() }); await write('users', users); res.json({ user: safe(u) }) });
app.post('/api/activity', auth, async (req, res) => { const all = await read('activity'); const s = sessions.get(req.sessionToken); s.lastSeen = Date.now(); s.currentPage = req.body.page || s.currentPage; all.push({ id: crypto.randomUUID(), userId: req.userId, at: new Date().toISOString(), ...req.body }); if (all.length > 10000) all.splice(0, all.length - 10000); await write('activity', all); res.json({ ok: true }) });
app.get('/api/progress', auth, async (req, res) => res.json({ progress: (await read('progress')).filter(x => x.userId === req.userId) }));
app.post('/api/progress', auth, async (req, res) => { const all = await read('progress'); let x = all.find(p => p.userId === req.userId && p.page === req.body.page); if (!x) { x = { id: crypto.randomUUID(), userId: req.userId, page: req.body.page, title: req.body.title || '', subject: req.body.subject || infer(req.body.page), completed: false }; all.push(x) } x.completed = !!req.body.completed; x.updatedAt = new Date().toISOString(); await write('progress', all); res.json({ progress: x }) });
function learningStatus(record) {
  if (record.status === 'COMPLETED' || record.manualConfirmed) return 'COMPLETED';
  return record.startedAt ? 'IN_PROGRESS' : 'NOT_STARTED';
}
function meetsCompletionCriteria(record) {
  const readOk = Number(record.maxScrollPercent || 0) >= LEARNING_CONFIG.minimumReadProgress;
  const sectionPercent = record.totalSections ? Number(record.sectionsViewed || 0) / Number(record.totalSections) * 100 : 0;
  const sectionsOk = sectionPercent >= LEARNING_CONFIG.minimumSectionsViewed;
  const timeOk = Number(record.activeTimeSeconds || 0) >= LEARNING_CONFIG.minimumActiveTimeSeconds;
  const quizOk = !record.quizAvailable || !LEARNING_CONFIG.requireQuizIfAvailable || !!record.quizCompleted;
  return readOk && timeOk && sectionsOk && quizOk;
}
function normalizeLearning(body, previous = {}) {
  const now = new Date().toISOString();
  const record = {
    ...previous,
    type: 'learning',
    page: String(body.page || previous.page || '').slice(0, 1000),
    title: String(body.title || previous.title || '').slice(0, 300),
    subjectId: String(body.subjectId || previous.subjectId || infer(body.page)).slice(0, 120),
    unitId: String(body.unitId || previous.unitId || '').slice(0, 200),
    chapterId: String(body.chapterId || previous.chapterId || body.page || '').slice(0, 300),
    maxScrollPercent: Math.max(Number(previous.maxScrollPercent || 0), Math.min(100, Math.max(0, Number(body.maxScrollPercent || 0)))),
    sectionsViewed: Math.max(Number(previous.sectionsViewed || 0), Math.max(0, Number(body.sectionsViewed || 0))),
    totalSections: Math.max(Number(previous.totalSections || 0), Math.max(0, Number(body.totalSections || 0))),
    currentSectionId: String(body.currentSectionId || previous.currentSectionId || '').slice(0, 200),
    lastPosition: Math.max(0, Number(body.lastPosition ?? previous.lastPosition ?? 0)),
    quizAvailable: Boolean(body.quizAvailable ?? previous.quizAvailable),
    quizStarted: Boolean(body.quizStarted || previous.quizStarted),
    quizCompleted: Boolean(body.quizCompleted || previous.quizCompleted),
    quizScore: body.quizScore == null ? (previous.quizScore ?? null) : Math.min(100, Math.max(0, Number(body.quizScore))),
    attempts: Math.max(Number(previous.attempts || 0), Number(body.attempts || 0)),
    manualConfirmed: Boolean(body.manualConfirmed || previous.manualConfirmed),
    activeTimeSeconds: Math.min(31536000, Math.max(0, Number(body.activeTimeSeconds ?? previous.activeTimeSeconds ?? 0))),
    lastActiveAt: body.lastActiveAt || previous.lastActiveAt || now,
    updatedAt: now
  };
  if (!record.startedAt) record.startedAt = previous.startedAt || now;
  record.status = meetsCompletionCriteria(record) || record.manualConfirmed ? 'COMPLETED' : 'IN_PROGRESS';
  record.completedAt = record.status === 'COMPLETED' ? (previous.completedAt || now) : null;
  return record;
}
app.get('/api/learning/config', auth, (req, res) => res.json({ config: LEARNING_CONFIG }));
app.get('/api/learning/progress', auth, async (req, res) => { const all = await read('progress'); res.json({ progress: all.filter(x => x.userId === req.userId && x.type === 'learning'), config: LEARNING_CONFIG }); });
app.post('/api/learning/progress', auth, async (req, res) => {
  if (!req.body.page) return res.status(400).json({ message: 'Chapter page is required.' });
  const all = await read('progress');
  const index = all.findIndex(x => x.userId === req.userId && x.type === 'learning' && x.page === req.body.page);
  const previous = index >= 0 ? all[index] : { id: crypto.randomUUID(), userId: req.userId };
  const record = normalizeLearning(req.body, previous);
  if (index >= 0) all[index] = { ...previous, ...record }; else all.push({ ...previous, ...record });
  const session = sessions.get(req.sessionToken); session.lastSeen = Date.now(); session.currentPage = record.page; session.learning = record;
  await write('progress', all);
  res.json({ progress: { ...record, status: learningStatus(record) }, config: LEARNING_CONFIG });
});
app.post('/api/learning/heartbeat', auth, async (req, res) => {
  const session = sessions.get(req.sessionToken); session.lastSeen = Date.now(); session.currentPage = String(req.body.page || session.currentPage || '');
  res.json({ ok: true, lastActiveAt: new Date(session.lastSeen).toISOString() });
});
function infer(p = '') { const m = p.match(/content\/[^/]+\/([^/]+)/); return m ? m[1].replace(/-hindi$/, '').toUpperCase() : 'Course' }
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'brajkant02@gmail.com', ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Divya@0708';
app.post('/api/admin/login', async (req, res) => { if ((req.body.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase() || req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ message: 'Invalid admin credentials.' }); const t = token(); adminSessions.set(t, { at: Date.now() }); res.json({ token: t }) });
app.post('/api/admin/logout', admin, (req, res) => { adminSessions.delete(req.header('x-admin-token')); res.json({ message: 'Admin logged out.' }) });
app.get('/api/admin/dashboard', admin, async (req, res) => { const [users, activity, progress] = await Promise.all([read('users'), read('activity'), read('progress')]); const now = Date.now(), day = new Date().toISOString().slice(0, 10); const rows = users.map(u => { const sess = [...sessions.values()].find(s => s.userId === u.id); const ps = progress.filter(p => p.userId === u.id && p.type === 'learning'); const latest = ps.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0]; const age = sess ? Math.floor((now - sess.lastSeen) / 1000) : Infinity; return { ...safe(u), online: age < 120, presence: age < 60 ? 'ONLINE' : age < 120 ? 'AWAY' : 'OFFLINE', currentPage: latest?.page || sess?.currentPage || '', currentSubject: latest?.subjectId || '', currentUnit: latest?.unitId || '', currentChapter: latest?.chapterId || '', currentSection: latest?.currentSectionId || '', readingProgress: latest?.maxScrollPercent || 0, activeTimeSeconds: latest?.activeTimeSeconds || 0, lastActivity: sess ? new Date(sess.lastSeen).toISOString() : latest?.lastActiveAt || u.lastLogoutAt || u.lastLoginAt, completion: ps.length ? Math.round(ps.reduce((sum, x) => sum + (x.maxScrollPercent || 0), 0) / ps.length) : 0 } }); res.json({ stats: { totalStudents: users.length, onlineStudents: rows.filter(x => x.presence === 'ONLINE').length, loginsToday: users.filter(x => (x.lastLoginAt || '').startsWith(day)).length, averageCompletion: rows.length ? Math.round(rows.reduce((a, b) => a + b.completion, 0) / rows.length) : 0 }, students: rows, recentActivity: activity.slice(-30).reverse().map(a => ({ ...a, studentName: users.find(u => u.id === a.userId)?.name })) }); });
app.listen(PORT, () => console.log(`BK LearnX backend: http://localhost:${PORT}`));