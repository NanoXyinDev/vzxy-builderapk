function errorMessage(e) { return e && typeof e === "object" ? String(e.message || e.error || JSON.stringify(e)) : String(e || "Unknown error"); }
const { readSession } = require('./_lib/auth');
module.exports = async (req, res) => {
  try {
    const user = readSession(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    return res.status(200).json({ ok: true, user });
  } catch (e) {
    return res.status(500).json({ ok: false, error: errorMessage(e) });
  }
};
