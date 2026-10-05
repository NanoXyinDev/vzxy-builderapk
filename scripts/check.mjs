import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const jsFiles = [];
const htmlFiles = [];
const cssFiles = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') walk(p);
    else if (ent.isFile()) {
      if (p.endsWith('.js')) jsFiles.push(p);
      if (p.endsWith('.html')) htmlFiles.push(p);
      if (p.endsWith('.css')) cssFiles.push(p);
    }
  }
}

walk(path.join(root, 'api'));
walk(path.join(root, 'public'));

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(`JS syntax error: ${file}\n${result.stderr}`);
    process.exit(1);
  }
}

for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const lower = text.toLowerCase();
  for (const required of ['<!doctype html>', '<html', '<head', '</head>', '<body', '</body>', '</html>']) {
    if (!lower.includes(required)) {
      console.error(`HTML structure error: ${file} is missing ${required}`);
      process.exit(1);
    }
  }
  const ids = [...text.matchAll(/\sid=["']([^"']+)["']/gi)].map(m => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) {
      console.error(`Duplicate HTML id in ${file}: ${id}`);
      process.exit(1);
    }
    seen.add(id);
  }
}

for (const file of cssFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const opens = (text.match(/\{/g) || []).length;
  const closes = (text.match(/\}/g) || []).length;
  if (opens !== closes) {
    console.error(`CSS brace mismatch: ${file} (${opens} opening / ${closes} closing)`);
    process.exit(1);
  }
}

for (const file of ['package.json', 'vercel.json']) JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

console.log(`Checked ${jsFiles.length} JS, ${htmlFiles.length} HTML, ${cssFiles.length} CSS files.`);
console.log('Static checks passed.');
