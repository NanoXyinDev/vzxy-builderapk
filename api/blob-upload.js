const crypto = require('crypto');
const { readSession } = require('./_lib/auth');

const MAX_UPLOAD = 250 * 1024 * 1024;
const ALLOWED = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];

function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function cleanName(value) {
  const name = String(value || 'project.zip').trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!name || !/\.zip$/i.test(name)) fail('Only .zip files are allowed');
  return name.slice(-120);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const user = readSession(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Login required' });
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL) fail('BLOB_READ_WRITE_TOKEN is not configured. Create a Vercel Blob store first.', 503);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const filename = cleanName(body.filename);
    const size = Number(body.size || 0);
    const contentType = String(body.contentType || 'application/zip').toLowerCase();
    if (!Number.isFinite(size) || size <= 0) fail('Invalid ZIP size');
    if (size > MAX_UPLOAD) fail(`ZIP terlalu besar. Maksimum ${Math.round(MAX_UPLOAD / 1024 / 1024)} MB.`, 413);
    if (!ALLOWED.includes(contentType) && !contentType.startsWith('application/zip')) fail('Unsupported ZIP content type');
    const pathname = `build-inputs/${user.id}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${filename}`;
    const validUntil = Date.now() + 15 * 60 * 1000;
    const { issueSignedToken, presignUrl } = await import('@vercel/blob');
    const token = await issueSignedToken({ pathname, operations: ['put'], maximumSizeInBytes: MAX_UPLOAD, allowedContentTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'], validUntil });
    const { presignedUrl } = await presignUrl(token, { pathname, operation: 'put', validUntil });
    return res.status(200).json({ ok: true, pathname, uploadUrl: presignedUrl, expiresAt: validUntil, maxBytes: MAX_UPLOAD });
  } catch (e) {
    return res.status(Number(e.status) || 500).json({ ok: false, error: e.message || String(e) });
  }
};
