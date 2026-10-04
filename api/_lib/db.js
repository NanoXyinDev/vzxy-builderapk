const { readJson, updateJson } = require('./github-db');

const files = { users: 'users', servers: 'servers', builds: 'builds' };

async function initDb() { return true; }

async function getUsers() {
  const { value } = await readJson(files.users, []);
  return Array.isArray(value) ? value : [];
}

async function getServers() {
  const { value } = await readJson(files.servers, []);
  return Array.isArray(value) ? value : [];
}

async function getBuilds() {
  const { value } = await readJson(files.builds, []);
  return Array.isArray(value) ? value : [];
}

async function addUser(user) {
  await updateJson(files.users, users => {
    if (users.some(u => String(u.email).toLowerCase() === String(user.email).toLowerCase())) {
      const e = new Error('Email already registered');
      e.code = 'DUPLICATE_EMAIL';
      throw e;
    }
    return [...users, user];
  }, `auth: add user ${user.email}`);
}

async function addServer(server) {
  await updateJson(files.servers, servers => [...servers, server], `server: add ${server.name}`);
}

async function deleteServer(id) {
  await updateJson(files.servers, servers => servers.filter(s => s.id !== id), `server: delete ${id}`);
}

async function updateServer(id, patch) {
  const allowed = {};
  for (const key of ['name','host','port','username','provider','status']) if (patch[key] !== undefined) allowed[key] = patch[key];
  await updateJson(files.servers, servers => servers.map(s => s.id === id ? { ...s, ...allowed, updated_at: new Date().toISOString() } : s), `server: update ${id}`);
}

async function updateUserRole(id, role) {
  if (!['free', 'pro', 'admin'].includes(role)) throw new Error('Invalid role');
  await updateJson(files.users, users => users.map(u => u.id === id ? { ...u, role, updated_at: new Date().toISOString() } : u), `user: set ${id} role ${role}`);
}

async function addBuild(build) {
  await updateJson(files.builds, builds => [build, ...builds].slice(0, 100), `build: add ${build.id}`);
}

async function updateBuild(id, patch) {
  await updateJson(files.builds, builds => builds.map(b => b.id === id ? { ...b, ...patch, updated_at: new Date().toISOString() } : b), `build: update ${id}`);
}

module.exports = { initDb, getUsers, getServers, getBuilds, addUser, addServer, deleteServer, updateServer, updateUserRole, addBuild, updateBuild };
