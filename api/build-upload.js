const crypto = require('crypto');
const Busboy = require('busboy');
const unzipper = require('unzipper');
const { readSession } = require('./_lib/auth');
const { config } = require('./_lib/github-db');

const MAX_UPLOAD = 4 * 1024 * 1024;
const MAX_ENTRIES = 5000;
const MAX_UNCOMPRESSED = 100 * 1024 * 1024;

module.exports.config = { api: { bodyParser: false } };

function errorMessage(e) {
  if (e && typeof e === 'object') return String(e.message || e.error || JSON.stringify(e));
  return String(e || 'Unknown error');
}

function safeTag(value) {
  const tag = String(value || `build-${Date.now()}`).trim();
  if (!/^[a-zA-Z0-9._-]{1,60}$/.test(tag)) throw new Error('Invalid build tag');
  return tag;
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { files: 1, fields: 4, fileSize: MAX_UPLOAD } });
    const chunks = [];
    let tag = '';
    let filename = '';
    let fileError = null;
    bb.on('field', (name, value) => { if (name === 'tag') tag = value; });
    bb.on('file', (name, stream, info) => {
      if (name !== 'file') { stream.resume(); return; }
      filename = info.filename || 'project.zip';
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('limit', () => { fileError = new Error('ZIP terlalu besar. Maksimum upload langsung 4 MB.'); });
      stream.on('error', reject);
    });
    bb.on('error', reject);
    bb.on('finish', () => {
      if (fileError) return reject(fileError);
      const buffer = Buffer.concat(chunks);
      if (!buffer.length) return reject(new Error('ZIP file wajib diisi.'));
      resolve({ buffer, tag: safeTag(tag), filename });
    });
    req.pipe(bb);
  });
}

function githubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'ZXVCODE-Web'
  };
}

async function uploadToGithub(buffer, tag, userId) {
  const c = config();
  if (!c.token) throw Object.assign(new Error('GITHUB_TOKEN is not configured in Vercel Environment Variables'), { status: 503 });
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const path = `.zxv/build-inputs/${userId}/${tag}-${suffix}.zip`;
  const response = await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}`, {
    method: 'PUT',
    headers: githubHeaders(c.token),
    body: JSON.stringify({
      message: `build: upload source ${tag}`,
      content: buffer.toString('base64'),
      branch: c.branch
    })
  });
  const raw = await response.text();
  let data; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
  if (!response.ok) throw Object.assign(new Error(data.message || `GitHub API ${response.status}`), { status: 502 });
  const ref = encodeURIComponent(c.branch).replace(/%2F/g, '/');
  const rawUrl = `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${ref}/${path}`;
  return { path, rawUrl, sha: data.content?.sha || null };
}

async function inspectZip(buffer) {
  if (buffer.length < 4 || buffer.subarray(0, 2).toString() !== 'PK') throw new Error('File yang di-drop bukan ZIP yang valid.');
  const directory = await unzipper.Open.buffer(buffer);
  if (directory.files.length > MAX_ENTRIES) throw new Error(`ZIP memiliki terlalu banyak entry (maks ${MAX_ENTRIES}).`);
  let total = 0;
  for (const entry of directory.files) {
    const normalized = String(entry.path).replace(/\\/g, '/');
    if (normalized.startsWith('/') || normalized.includes('../') || normalized === '..') throw new Error('ZIP ditolak: path traversal terdeteksi.');
    if (entry.type === 'SymbolicLink') throw new Error('ZIP ditolak: symbolic link tidak diizinkan.');
    total += Number(entry.vars?.uncompressedSize || 0);
    if (total > MAX_UNCOMPRESSED) throw new Error('ZIP ditolak: total ukuran setelah extract melebihi 100 MB.');
  }
  return { entries: directory.files.length, uncompressedBytes: total };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const user = readSession(req);
  if (!user) return res.status(401).json({ ok: false, error: 'Login required' });
  try {
    const { buffer, tag, filename } = await parseMultipart(req);
    const inspection = await inspectZip(buffer);
    const uploaded = await uploadToGithub(buffer, tag, user.id);
    return res.status(201).json({ ok: true, tag, filename, size: buffer.length, inspection, ...uploaded });
  } catch (e) {
    return res.status(Number(e.status) || 400).json({ ok: false, error: errorMessage(e) });
  }
};
