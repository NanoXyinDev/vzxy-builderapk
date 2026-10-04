function errorMessage(e) { return e && typeof e === "object" ? String(e.message || e.error || JSON.stringify(e)) : String(e || "Unknown error"); }
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getUsers, addUser, initDb } = require('./_lib/db');
const { createSession, setSession, clearSession } = require('./_lib/auth');

function body(req) { return typeof req.body === 'object' && req.body ? req.body : {}; }
function clean(s, max = 120) { return String(s || '').trim().slice(0, max); }
function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function publicUser(u) { return { id: u.id, name: u.name, email: u.email, role: u.role }; }
function getBootstrapAdmin(email) { return clean(process.env.ADMIN_EMAIL, 160).toLowerCase() === email; }

module.exports = async (req, res) => {
  try {
    res.setHeader('Cache-Control','no-store');
    await initDb();
    const action = clean(req.query?.action);
    if (req.method === 'POST' && action === 'register') {
      const name = clean(body(req).name, 80);
      const email = clean(body(req).email, 160).toLowerCase();
      const password = String(body(req).password || '');
      const confirmation = String(body(req).password_confirm || '');
      if (!name || !validEmail(email) || password.length < 8 || (confirmation && confirmation !== password))
        return res.status(400).json({ ok: false, error: confirmation && confirmation !== password ? 'Password confirmation does not match' : 'Name, valid email, and password of at least 8 characters are required' });
      const users = await getUsers();
      if (users.some(u => u.email === email)) return res.status(409).json({ ok: false, error: 'Email already registered' });
      const role = getBootstrapAdmin(email) ? 'admin' : 'free';
      const id = crypto.randomUUID();
      const password_hash = await bcrypt.hash(password, 12);
      const user = { id, name, email, password_hash, role, created_at: new Date().toISOString() };
      await addUser(user);
      const token = createSession(publicUser(user));
      setSession(res, token);
      return res.status(201).json({ ok: true, user: publicUser(user) });
    }
    if (req.method === 'POST' && action === 'login') {
      const email = clean(body(req).email, 160).toLowerCase();
      const password = String(body(req).password || '');
      const users = await getUsers();
      const u = users.find(x => x.email === email);
      if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ ok: false, error: 'Invalid email or password' });
      const token = createSession(publicUser(u));
      setSession(res, token);
      return res.status(200).json({ ok: true, user: publicUser(u) });
    }
    if (req.method === 'POST' && action === 'logout') {
      clearSession(res);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ ok: false, error: 'Unsupported auth action' });
  } catch (e) {
    if (e.code === 'DUPLICATE_EMAIL') return res.status(409).json({ ok: false, error: 'Email already registered' });
    return res.status(500).json({ ok: false, error: errorMessage(e) });
  }
};
