async function safeJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { throw new Error(text.slice(0, 180) || `HTTP ${response.status}`); }
}

async function getMe() {
  const r = await fetch('/api/me', { credentials: 'include', headers: { Accept: 'application/json' } });
  if (!r.ok) { location.href = '/login.html'; return null; }
  return (await safeJson(r)).user;
}

(async () => {
  try {
    const u = await getMe();
    if (!u) return;
    document.querySelector('#hello').textContent = `Hello, ${u.name}.`;
    document.querySelector('#role').textContent = u.role.toUpperCase();
    document.querySelector('#email').textContent = u.email;
    if (u.role === 'admin') document.querySelector('#adminLink').hidden = false;
  } catch (e) {
    document.querySelector('#hello').textContent = e.message;
  }
})();

document.querySelector('#logout').onclick = async () => {
  await fetch('/api/auth?action=logout', { method: 'POST', credentials: 'include' });
  location.href = '/login.html';
};
