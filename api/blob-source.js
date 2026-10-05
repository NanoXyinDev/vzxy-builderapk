const { getCurrentUser } = require('./_lib/session-user');
const { assertSameOrigin } = require('./_lib/security');
function blobOptions() { return {}; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  assertSameOrigin(req);
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Login required' });
  try {
    const { head, issueSignedToken, presignUrl } = await import('@vercel/blob');
    const pathname = String(req.body?.pathname || '').replace(/^\/+/, '');
    const prefix = `build-inputs/${user.id}/`;
    if (!pathname.startsWith(prefix) || pathname.includes('..')) return res.status(403).json({ ok: false, error: 'Invalid source path' });
    let info;
    let lastError;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        info = await head(pathname, blobOptions());
        break;
      } catch (e) {
        lastError = e;
        if (attempt < 3) await sleep(500 * (attempt + 1));
      }
    }
    if (!info) throw lastError || new Error('Uploaded ZIP could not be found');
    const validUntil = Date.now() + 24 * 60 * 60 * 1000;
    const token = await issueSignedToken({ ...blobOptions(), pathname, operations: ['get'], validUntil });
    const { presignedUrl } = await presignUrl(token, { pathname, operation: 'get', validUntil });
    return res.status(200).json({ ok: true, pathname, sourceUrl: presignedUrl, size: info.size, etag: info.etag });
  } catch (e) {
    return res.status(Number(e.status) || 404).json({ ok: false, error: e.message || 'Source ZIP not found' });
  }
};
