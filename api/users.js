const { getUsers, updateUserRole } = require('./_lib/db');
const { getCurrentUser } = require('./_lib/session-user');
const { assertSameOrigin } = require('./_lib/security');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const me = await getCurrentUser(req);
    if (!me) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    if (me.role !== 'admin') return res.status(403).json({ ok: false, error: 'Admin only' });
    if (req.method === 'GET') {
      const users = await getUsers();
      return res.json({ ok: true, users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: String(process.env.ADMIN_EMAIL||'').trim().toLowerCase() === String(u.email).toLowerCase() ? 'admin' : u.role, created_at: u.created_at })) });
    }
    if (req.method === 'PATCH') {
      assertSameOrigin(req);
      const id = String(req.body?.id || '').trim();
      const role = String(req.body?.role || '').trim().toLowerCase();
      if (!id || !['free', 'pro', 'admin'].includes(role)) return res.status(400).json({ ok: false, error: 'Invalid user or role' });
      if (id === me.id && role !== 'admin') return res.status(400).json({ ok: false, error: 'You cannot remove your own admin role' });
      const adminEmail = String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
      const users = await getUsers();
      const target = users.find(u => u.id === id);
      if (!target) return res.status(404).json({ ok:false,error:'User not found' });
      if (adminEmail && String(target.email).toLowerCase() === adminEmail && role !== 'admin') return res.status(400).json({ok:false,error:'Bootstrap admin cannot be downgraded'});
      await updateUserRole(id, role);
      return res.json({ ok: true });
    }
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) { return res.status(Number(e.status) || 500).json({ ok: false, error: e.message || String(e) }); }
};
