const { readJson, updateJson } = require('./github-db');

const files = {
  users: 'users',
  servers: 'servers'
};

async function getUsers() {
  const { value } = await readJson(files.users, []);
  return Array.isArray(value) ? value : [];
}

async function getServers() {
  const { value } = await readJson(files.servers, []);
  return Array.isArray(value) ? value : [];
}

async function addUser(user) {
  await updateJson(files.users, users => {
    if (users.some(u => u.email === user.email)) {
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

async function updateUserRole(id, role) {
  const allowed = ['free', 'pro', 'admin'];
  if (!allowed.includes(role)) throw new Error('Invalid role');
  await updateJson(files.users, users => users.map(u => u.id === id ? { ...u, role, updated_at: new Date().toISOString() } : u), `user: set ${id} role ${role}`);
}

async function initDb() {
  const [users, servers] = await Promise.all([readJson(files.users, []), readJson(files.servers, [])]);
  if (users.sha === null) await updateJson(files.users, value => Array.isArray(value) ? value : [], 'db: initialize users.json');
  if (servers.sha === null) await updateJson(files.servers, value => Array.isArray(value) ? value : [], 'db: initialize servers.json');
}

module.exports = { getUsers, getServers, addUser, addServer, deleteServer, updateUserRole, initDb };
