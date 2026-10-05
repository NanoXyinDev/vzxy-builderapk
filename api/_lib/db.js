const { readJson, updateJson } = require('./github-db');

const files = { users: 'users', servers: 'servers', builds: 'builds' };

const FREE_BUILD_LIMIT = 5;
const FREE_BUILD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function buildQuota(builds, user) {
  if (user.role !== 'free') return { limited: false, limit: null, used: 0, remaining: null, resetAt: null };
  const cutoff = Date.now() - FREE_BUILD_WINDOW_MS;
  const own = (Array.isArray(builds) ? builds : []).filter(b => String(b.user_id) === String(user.id) && !Boolean(b.only_analyze) && Date.parse(b.created_at || '') >= cutoff);
  const oldest = own.map(b => Date.parse(b.created_at || '')).filter(Number.isFinite).sort((a, b) => a - b)[0];
  return { limited: true, limit: FREE_BUILD_LIMIT, used: own.length, remaining: Math.max(0, FREE_BUILD_LIMIT - own.length), resetAt: own.length >= FREE_BUILD_LIMIT && oldest ? new Date(oldest + FREE_BUILD_WINDOW_MS).toISOString() : null };
}

async function reserveBuild(build, user) {
  let reserved;
  await updateJson(files.builds, builds => {
    const quota = buildQuota(builds, user);
    if (quota.limited && quota.remaining <= 0) {
      const e = new Error(quota.resetAt ? `Free plan sudah mencapai 5 build. Slot berikutnya tersedia ${quota.resetAt}.` : 'Free plan sudah mencapai 5 build.');
      e.code = 'FREE_BUILD_LIMIT';
      e.status = 429;
      e.quota = quota;
      throw e;
    }
    reserved = { ...build, quota_after: quota.limited ? { ...quota, used: quota.used + 1, remaining: Math.max(0, quota.remaining - 1) } : quota };
    return [reserved, ...builds].slice(0, 100);
  }, `build: reserve ${build.id}`);
  return reserved;
}

async function getBuildQuota(user) {
  return buildQuota(await getBuilds(), user);
}


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

module.exports = { initDb, getUsers, getServers, getBuilds, addUser, addServer, deleteServer, updateServer, updateUserRole, addBuild, reserveBuild, getBuildQuota, buildQuota, updateBuild };
