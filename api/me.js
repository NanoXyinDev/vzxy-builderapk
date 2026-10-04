function errorMessage(e) { return e && typeof e === "object" ? String(e.message || e.error || JSON.stringify(e)) : String(e || "Unknown error"); }
const { getSession } = require('./_lib/auth');
module.exports = async (req, res) => {
  try {
    const user = await getSession(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    return res.json({ ok: true, user });
  } catch (e) { return res.status(500).json({ ok: false, error: errorMessage(e) }); }
};
