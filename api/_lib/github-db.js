const API = 'https://api.github.com';
const owner = process.env.GITHUB_OWNER || 'NanoXyinDev';
const repo = process.env.GITHUB_REPO || 'Vzxy-BuilderApk';
const branch = process.env.GITHUB_BRANCH || 'main';
const token = process.env.GITHUB_TOKEN;

function assertConfig() {
  if (!token) throw new Error('GITHUB_TOKEN is not configured');
}

function headers() {
  assertConfig();
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
}

function pathFor(name) {
  return `data/${name}.json`;
}

async function github(path, options = {}) {
  const r = await fetch(`${API}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!r.ok) {
    const err = new Error(typeof data?.message === 'string' ? data.message : (data?.message ? JSON.stringify(data.message) : `GitHub API ${r.status}`));
    err.status = r.status;
    throw err;
  }
  return data;
}

async function readJson(name, fallback = []) {
  const encoded = encodeURIComponent(pathFor(name)).replace(/%2F/g, '/');
  try {
    const data = await github(`/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`);
    const raw = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
    return { value: JSON.parse(raw), sha: data.sha };
  } catch (e) {
    if (e.status !== 404) throw e;
    return { value: fallback, sha: null };
  }
}

async function writeJson(name, value, sha, message) {
  const encoded = encodeURIComponent(pathFor(name)).replace(/%2F/g, '/');
  const body = {
    message,
    content: Buffer.from(JSON.stringify(value, null, 2) + '\n').toString('base64'),
    branch
  };
  if (sha) body.sha = sha;
  return github(`/repos/${owner}/${repo}/contents/${encoded}`, { method: 'PUT', body: JSON.stringify(body) });
}

async function updateJson(name, updater, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readJson(name, []);
    const next = await updater(current.value);
    try {
      return await writeJson(name, next, current.sha, message);
    } catch (e) {
      if (e.status !== 409 || attempt === 2) throw e;
    }
  }
}

module.exports = { readJson, writeJson, updateJson, owner, repo, branch };
