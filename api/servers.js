function errorMessage(e) { return e && typeof e === "object" ? String(e.message || e.error || JSON.stringify(e)) : String(e || "Unknown error"); }
const crypto = require('crypto');
const { getServers, addServer, deleteServer, updateServer, initDb } = require('./_lib/db');
const { readSession } = require('./_lib/auth');

function body(req) { return typeof req.body === 'object' && req.body ? req.body : {}; }
function clean(s, max = 120) { return String(s || '').trim().slice(0, max); }
function isAdmin(user) { return user && user.role === 'admin'; }

module.exports = async (req, res) => {
  try {
    await initDb();
    const user = readSession(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    if (!isAdmin(user)) return res.status(403).json({ ok: false, error: 'Admin only' });

    if (req.method === 'GET') return res.json({ ok: true, servers: await getServers() });
    if (req.method === 'POST') {
      const b = body(req);
      const name = clean(b.name, 80);
      const host = clean(b.host, 255);
      const port = Number(b.port || 22);
      const username = clean(b.username || 'root', 80);
      const provider = clean(b.provider || 'custom', 80);
      const status = clean(b.status || 'offline', 20).toLowerCase();
      if (!['online','offline','maintenance'].includes(status)) return res.status(400).json({ ok: false, error: 'Invalid server status' });
      if (!name || !host || !Number.isInteger(port) || port < 1 || port > 65535) return res.status(400).json({ ok: false, error: 'Name, host and valid port are required' });
      const server = { id: crypto.randomUUID(), name, host, port, username, provider, status, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await addServer(server);
      return res.status(201).json({ ok: true, server });
    }
    if (req.method === 'PATCH') {
      const id = clean(req.body?.id, 80);
      const status = clean(req.body?.status, 20).toLowerCase();
      if (!id || !['online','offline','maintenance'].includes(status)) return res.status(400).json({ ok: false, error: 'Invalid server or status' });
      await updateServer(id, { status });
      return res.json({ ok: true });
    }
    if (req.method === 'DELETE') {
      const id = clean(req.query?.id, 80);
      if (!id) return res.status(400).json({ ok: false, error: 'Missing server id' });
      await deleteServer(id);
      return res.json({ ok: true });
    }
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) { return res.status(500).json({ ok: false, error: errorMessage(e) }); }
};
