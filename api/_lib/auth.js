const crypto = require('crypto');

function secret() {
  const value = String(process.env.AUTH_SECRET || '');
  if (value.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters');
  return value;
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(input) {
  return crypto.createHmac('sha256', secret()).update(input).digest('base64url');
}

function timingSafe(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function createSession(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    iat: now,
    exp: now + 604800
  }));
  const input = `${header}.${payload}`;
  return `${input}.${sign(input)}`;
}

function readSession(req) {
  const cookies = String(req.headers.cookie || '');
  const match = cookies.match(/(?:^|;\s*)zxv_session=([^;]+)/);
  if (!match) return null;
  try {
    const token = decodeURIComponent(match[1]);
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') return null;
    if (!timingSafe(signature, sign(`${header}.${payload}`))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Number(data.exp) <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function setSession(res, token) {
  res.setHeader('Set-Cookie', `zxv_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', 'zxv_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}

module.exports = { createSession, readSession, setSession, clearSession };
