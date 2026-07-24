require('dotenv').config();
const express = require('express'), cors = require('cors'), bcrypt = require('bcryptjs'), fs = require('fs').promises, path = require('path'), crypto = require('crypto'), nodemailer = require('nodemailer');
const app = express(), PORT = process.env.PORT || 3000, DATA = path.join(__dirname, 'data'); app.use(cors()); app.use(express.json({ limit: '3mb' }));
const files = { users: 'users.json', activity: 'activity.json', progress: 'progress.json' }; const sessions = new Map(), adminSessions = new Map();
async function read(k) { try { return JSON.parse(await fs.readFile(path.join(DATA, files[k]), 'utf8')) } catch { return [] } } async function write(k, v) { await fs.mkdir(DATA, { recursive: true }); await fs.writeFile(path.join(DATA, files[k]), JSON.stringify(v, null, 2)) } const token = () => crypto.randomBytes(24).toString('hex');
async function auth(req, res, next) { const t = (req.headers.authorization || '').replace('Bearer ', ''); const s = sessions.get(t); if (!s) return res.status(401).json({ message: 'Please login again.' }); req.userId = s.userId; req.sessionToken = t; next() }
function admin(req, res, next) { const t = req.header('x-admin-token'); if (!adminSessions.has(t)) return res.status(401).json({ message: 'Unauthorized' }); next() }
app.get('/api/health', (q, r) => r.json({ status: 'ok' }));
app.post('/api/register', async (req, res) => { const { name, email, branch, semester, password, confirmPassword } = req.body; if (!name || !email || !branch || !semester || !password) return res.status(400).json({ message: 'All fields required.' }); if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' }); const users = await read('users'); if (users.some(x => x.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ message: 'Email already registered.' }); const u = { id: crypto.randomUUID(), name, email, branch, semester, passwordHash: await bcrypt.hash(password, 10), registeredAt: new Date().toISOString(), lastLoginAt: null, lastLogoutAt: null, phone: '', college: '', photo: '' }; users.push(u); await write('users', users); res.status(201).json({ message: 'Registration successful.' }) });
app.post('/api/login', async (req, res) => { const users = await read('users'), u = users.find(x => x.email.toLowerCase() === (req.body.email || '').toLowerCase()); if (!u || !await bcrypt.compare(req.body.password || '', u.passwordHash)) return res.status(401).json({ message: 'Invalid email or password.' }); u.lastLoginAt = new Date().toISOString(); await write('users', users); const t = token(); sessions.set(t, { userId: u.id, loginAt: Date.now(), lastSeen: Date.now(), currentPage: '' }); res.json({ token: t, user: safe(u) }) });

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
  res.json({ message: 'Password successfully update ho gaya.' });
});

app.post('/api/logout', auth, async (req, res) => { const users = await read('users'), u = users.find(x => x.id === req.userId); if (u) { u.lastLogoutAt = new Date().toISOString(); await write('users', users) } sessions.delete(req.sessionToken); res.json({ message: 'Logged out' }) });
const safe = u => { const { passwordHash, ...x } = u; return x };
app.get('/api/me', auth, async (req, res) => { const u = (await read('users')).find(x => x.id === req.userId); res.json({ user: safe(u) }) });
app.put('/api/me', auth, async (req, res) => { const users = await read('users'), u = users.find(x => x.id === req.userId);['name', 'branch', 'semester', 'phone', 'college', 'photo'].forEach(k => { if (req.body[k] !== undefined) u[k] = req.body[k] }); await write('users', users); res.json({ user: safe(u) }) });
app.post('/api/activity', auth, async (req, res) => { const all = await read('activity'); const s = sessions.get(req.sessionToken); s.lastSeen = Date.now(); s.currentPage = req.body.page || s.currentPage; all.push({ id: crypto.randomUUID(), userId: req.userId, at: new Date().toISOString(), ...req.body }); if (all.length > 10000) all.splice(0, all.length - 10000); await write('activity', all); res.json({ ok: true }) });
app.get('/api/progress', auth, async (req, res) => res.json({ progress: (await read('progress')).filter(x => x.userId === req.userId) }));
app.post('/api/progress', auth, async (req, res) => { const all = await read('progress'); let x = all.find(p => p.userId === req.userId && p.page === req.body.page); if (!x) { x = { id: crypto.randomUUID(), userId: req.userId, page: req.body.page, title: req.body.title || '', subject: req.body.subject || infer(req.body.page), completed: false }; all.push(x) } x.completed = !!req.body.completed; x.updatedAt = new Date().toISOString(); await write('progress', all); res.json({ progress: x }) });
function infer(p = '') { const m = p.match(/content\/[^/]+\/([^/]+)/); return m ? m[1].replace(/-hindi$/, '').toUpperCase() : 'Course' }
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bklearnx.local', ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
app.post('/api/admin/login', async (req, res) => { if ((req.body.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase() || req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ message: 'Invalid admin credentials.' }); const t = token(); adminSessions.set(t, { at: Date.now() }); res.json({ token: t }) });
app.get('/api/admin/dashboard', admin, async (req, res) => { const [users, activity, progress] = await Promise.all([read('users'), read('activity'), read('progress')]); const now = Date.now(), day = new Date().toISOString().slice(0, 10); const rows = users.map(u => { const sess = [...sessions.values()].find(s => s.userId === u.id); const ps = progress.filter(p => p.userId === u.id); return { ...safe(u), online: !!sess && now - sess.lastSeen < 120000, currentPage: sess?.currentPage || '', lastActivity: sess ? new Date(sess.lastSeen).toISOString() : u.lastLogoutAt || u.lastLoginAt, completion: ps.length ? Math.round(ps.filter(x => x.completed).length / ps.length * 100) : 0 } }); res.json({ stats: { totalStudents: users.length, onlineStudents: rows.filter(x => x.online).length, loginsToday: users.filter(x => (x.lastLoginAt || '').startsWith(day)).length, averageCompletion: rows.length ? Math.round(rows.reduce((a, b) => a + b.completion, 0) / rows.length) : 0 }, students: rows, recentActivity: activity.slice(-30).reverse().map(a => ({ ...a, studentName: users.find(u => u.id === a.userId)?.name })) }) });
app.listen(PORT, () => console.log(`BK LearnX backend: http://localhost:${PORT}`));

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});