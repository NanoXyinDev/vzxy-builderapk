const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sql, initDb } = require("./_lib/db");
const { createSession, setSession, clearSession } = require("./_lib/auth");

function body(req) {
  return typeof req.body === "object" && req.body ? req.body : {};
}
function clean(s, max=120) {
  return String(s || "").trim().slice(0,max);
}
function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

module.exports = async (req, res) => {
  try {
    await initDb();
    const action = clean(req.query?.action);
    if (req.method === "POST" && action === "register") {
      const name = clean(body(req).name, 80);
      const email = clean(body(req).email, 160).toLowerCase();
      const password = String(body(req).password || "");
      if (!name || !validEmail(email) || password.length < 8)
        return res.status(400).json({ok:false,error:"Name, valid email, and password of at least 8 characters are required"});
      const exists = await sql`SELECT id FROM users WHERE email=${email} LIMIT 1`;
      if (exists.length) return res.status(409).json({ok:false,error:"Email already registered"});
      const count = await sql`SELECT COUNT(*)::int AS count FROM users`;
      const role = Number(count[0].count) === 0 ? "admin" : "user";
      const id = crypto.randomUUID();
      const hash = await bcrypt.hash(password, 12);
      await sql`INSERT INTO users (id,name,email,password_hash,role) VALUES (${id},${name},${email},${hash},${role})`;
      const token = await createSession({id,name,email,role});
      setSession(res, token);
      return res.status(201).json({ok:true,user:{id,name,email,role}});
    }
    if (req.method === "POST" && action === "login") {
      const email = clean(body(req).email, 160).toLowerCase();
      const password = String(body(req).password || "");
      const rows = await sql`SELECT id,name,email,password_hash,role FROM users WHERE email=${email} LIMIT 1`;
      if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
        return res.status(401).json({ok:false,error:"Invalid email or password"});
      const u = rows[0];
      const token = await createSession(u);
      setSession(res, token);
      return res.status(200).json({ok:true,user:{id:u.id,name:u.name,email:u.email,role:u.role}});
    }
    if (req.method === "POST" && action === "logout") {
      clearSession(res);
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({ok:false,error:"Unsupported auth action"});
  } catch (e) {
    return res.status(500).json({ok:false,error:e.message});
  }
};
