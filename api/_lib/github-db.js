const API = 'https://api.github.com';

function config() {
  return {
    owner: String(process.env.GITHUB_OWNER || 'NanoXyinDev'),
    repo: String(process.env.GITHUB_REPO || 'vzxy-builderapk'),
    branch: String(process.env.GITHUB_BRANCH || 'main'),
    token: String(process.env.GITHUB_TOKEN || '')
  };
}

function assertConfig() {
  if (!config().token) {
    const error = new Error('GITHUB_TOKEN is not configured in Vercel Environment Variables');
    error.status = 503;
    throw error;
  }
}

function headers() {
  assertConfig();
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${config().token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'ZXVCODE-Web'
  };
}

function pathFor(name) {
  return `data/${name}.json`;
}

function publicError(data, status) {
  const message = typeof data?.message === 'string' ? data.message : `GitHub API ${status}`;
  const error = new Error(message.slice(0, 500));
  error.status = status;
  return error;
}

async function github(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text || `GitHub API ${response.status}` }; }
  if (!response.ok) throw publicError(data, response.status);
  return data;
}

async function readJson(name, fallback = []) {
  const { owner, repo, branch } = config();
  const encoded = encodeURIComponent(pathFor(name)).replace(/%2F/g, '/');
  try {
    const data = await github(`/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`);
    if (!data || data.type !== 'file' || typeof data.content !== 'string') {
      const error = new Error(`GitHub data/${name}.json is not a file`);
      error.status = 502;
      throw error;
    }
    const raw = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
    return { value: JSON.parse(raw), sha: data.sha };
  } catch (e) {
    if (e.status !== 404) throw e;
    return { value: fallback, sha: null };
  }
}

async function writeJson(name, value, sha, message) {
  const { owner, repo, branch } = config();
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
  throw new Error('GitHub update failed');
}

module.exports = { readJson, writeJson, updateJson, config };
