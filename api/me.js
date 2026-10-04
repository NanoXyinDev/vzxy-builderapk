const { getCurrentUser } = require('./_lib/session-user');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Login required' });
    return res.json({ ok: true, user });
  } catch (e) { return res.status(Number(e.status) || 500).json({ ok: false, error: e.message || String(e) }); }
};
