const form = document.querySelector('#form');
const msg = document.querySelector('#msg');

async function jsonResponse(response) {
  const text = await response.text();
  try {
    return { data: JSON.parse(text), raw: text };
  } catch {
    return { data: null, raw: text };
  }
}

function readableError(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.message || value.error || JSON.stringify(value);
  return value == null ? '' : String(value);
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  msg.textContent = 'Processing...';
  const data = Object.fromEntries(new FormData(form));
  const action = location.pathname.includes('register') ? 'register' : 'login';
  try {
    const r = await fetch(`/api/auth?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    const parsed = await jsonResponse(r);
    if (!r.ok) throw new Error(readableError(parsed.data?.error) || parsed.raw?.slice(0, 180) || `Request failed (${r.status})`);
    if (!parsed.data?.ok) throw new Error(readableError(parsed.data?.error) || 'Request failed');
    location.href = '/dashboard';
  } catch (e) {
    msg.textContent = e.message || 'Request failed';
  }
});
