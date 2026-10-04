const { readSession } = require('./_lib/auth');
const { oidcOptions, STORE_ID, explainBlobError } = require('./_lib/blob');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const user = readSession(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Login required' });
  try {
    const { list } = await import('@vercel/blob');
    const prefix = `build-inputs/${user.id}/`;
    const result = await list({ prefix, limit: 1, ...oidcOptions() });
    return res.status(200).json({ ok: true, provider: 'vercel-blob', auth: 'oidc', storeId: STORE_ID, accessible: true, sampleCount: result.blobs?.length || 0 });
  } catch (e) {
    return res.status(Number(e.status) || 502).json({ ok: false, provider: 'vercel-blob', auth: 'oidc', storeId: STORE_ID, accessible: false, error: explainBlobError(e) });
  }
};
