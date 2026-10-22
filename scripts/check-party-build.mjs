import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const IMPORT_RE = /(?:\bimport\s*(?:[^'";]*?\s+from\s*)?|\bexport\s+[^'";]*?\s+from\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };

if (!fs.existsSync(path.join(DIST, 'index.html'))) errors.push('dist/index.html is missing; run scripts/build-party.mjs first.');
const files = fs.existsSync(DIST) ? allFiles(DIST) : [];
const relativeFiles = files.map(file => path.relative(DIST, file).split(path.sep).join('/'));
check(relativeFiles.includes('party/main.js'), 'dist/party/main.js is missing.');
check(relativeFiles.includes('party/world.json'), 'dist/party/world.json is missing.');
check(relativeFiles.includes('vendor/three.module.min.js'), 'Vendored Three.js module is missing.');
check(relativeFiles.includes('vendor/addons/utils/BufferGeometryUtils.js'), 'BufferGeometryUtils is missing.');
check(!relativeFiles.some(file => file.startsWith('scripts/')), 'Build output must not contain scripts/.');
check(!relativeFiles.some(file => /(?:^|\/)(?:invites?|private|party-config)(?:[-_.\/]|$)/i.test(file)), 'Build output contains a private invitation/config file path.');
check(!relativeFiles.some(file => /(?:^|\/)(?:Game\.ts|main\.ts|story)(?:\/|$)/i.test(file)), 'Build output contains an original game entry or story source.');
check(!relativeFiles.some(file => /^src\/(?:Game\.js|main\.js|story\/)/i.test(file)), 'Build output exposes the original single-player application.');

for (const file of files.filter(file => /\.m?js$/.test(file) && !file.includes('/vendor/'))) {
  const code = fs.readFileSync(file, 'utf8');
  check(!/\.ts(?:['"]|\b)/.test(code), `Unresolved TypeScript import/reference in ${path.relative(DIST, file)}.`);
  for (const match of code.matchAll(IMPORT_RE)) {
    const target = match[1];
    if (!target.startsWith('.')) {
      if (target === 'three') check(relativeFiles.includes('vendor/three.module.min.js'), 'Import map target for "three" is missing.');
      else if (target.startsWith('three/addons/')) check(relativeFiles.includes('vendor/addons/' + target.slice('three/addons/'.length)), `Import map target for "${target}" is missing.`);
      continue;
    }
    const resolved = path.resolve(path.dirname(file), target.split('?')[0]);
    check(resolved.startsWith(DIST + path.sep), `Import escapes dist: ${path.relative(DIST, file)} -> ${target}`);
    check(fs.existsSync(resolved), `Missing import target: ${path.relative(DIST, file)} -> ${target}`);
  }
}

if (errors.length) {
  console.error(errors.map(error => `✗ ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Party build contract passed (${files.length} emitted files).`);
}

function allFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const full = path.join(dir, item.name);
    return item.isDirectory() ? allFiles(full) : [full];
  });
}
