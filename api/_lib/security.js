const crypto = require('crypto');

const buckets = new Map();

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 100);
}

function rateLimit(key, limit = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((windowMs - (now - current.startedAt)) / 1000) };
  }
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function assertSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) return;
  let expected;
  try { expected = new URL(`${proto}://${host}`).origin; } catch { return; }
  if (origin !== expected) {
    const e = new Error('Invalid request origin');
    e.status = 403;
    throw e;
  }
}

function randomId(bytes=16) { return crypto.randomBytes(bytes).toString('hex'); }

module.exports = { clientIp, rateLimit, assertSameOrigin, randomId };
