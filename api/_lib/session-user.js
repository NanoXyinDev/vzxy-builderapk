const { readSession } = require('./auth');
const { getUsers } = require('./db');

function publicUser(u) { return { id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at }; }

async function getCurrentUser(req) {
  const session = readSession(req);
  if (!session) return null;
  const users = await getUsers();
  const user = users.find(u => String(u.id) === String(session.id));
  if (!user) return null;
  const bootstrap = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const role = bootstrap && String(user.email).toLowerCase() === bootstrap ? 'admin' : user.role;
  return { ...publicUser(user), role };
}

module.exports = { getCurrentUser, publicUser };
