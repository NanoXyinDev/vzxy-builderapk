function errorMessage(e) { return e && typeof e === "object" ? String(e.message || e.error || JSON.stringify(e)) : String(e || "Unknown error"); }
const { getUsers, updateUserRole, initDb } = require('./_lib/db');
const { readSession } = require('./_lib/auth');

function clean(s, max = 120) { return String(s || '').trim().slice(0, max); }
module.exports = async (req, res) => {
  try {
    await initDb();
    const me = readSession(req);
    if (!me) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    if (me.role !== 'admin') return res.status(403).json({ ok: false, error: 'Admin only' });
    if (req.method === 'GET') {
      const users = await getUsers();
      return res.json({ ok: true, users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at })) });
    }
    if (req.method === 'PATCH') {
      const id = clean(req.body?.id, 100);
      const role = clean(req.body?.role, 20);
      if (!id || !['free', 'pro', 'admin'].includes(role)) return res.status(400).json({ ok: false, error: 'Invalid user or role' });
      if (id === me.id && role !== 'admin') return res.status(400).json({ ok: false, error: 'You cannot remove your own admin role' });
      await updateUserRole(id, role);
      return res.json({ ok: true });
    }
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) { return res.status(500).json({ ok: false, error: errorMessage(e) }); }
};
