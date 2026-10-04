const { SignJWT, jwtVerify } = require("jose");

function secret() {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

async function createSession(user) {
  return new SignJWT({ sub: user.id, role: user.role, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

async function readSession(req) {
  const raw = req.headers.cookie || "";
  const match = raw.match(/(?:^|;\s*)zxv_session=([^;]+)/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(decodeURIComponent(match[1]), secret());
    return payload;
  } catch {
    return null;
  }
}

function setSession(res, token) {
  res.setHeader("Set-Cookie", `zxv_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
}

function clearSession(res) {
  res.setHeader("Set-Cookie", "zxv_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
}

module.exports = { createSession, readSession, setSession, clearSession };
