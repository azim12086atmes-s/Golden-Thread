import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ENTRY = path.join(ROOT, 'party', 'main.js');
const sources = dirs => dirs.flatMap(dir => fs.readdirSync(dir, { withFileTypes:true }).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e => e.isDirectory() ? sources([path.join(dir,e.name)]) : /\.(m?js|ts|html|css)$/.test(e.name) ? [path.join(dir,e.name)] : []));
const revision = createHash('sha256');
for(const file of sources(['party','src','shared','great-palace','vendor'].map(d=>path.join(ROOT,d))))revision.update(fs.readFileSync(file));
const BUILD_ID = revision.digest('hex').slice(0,12);
const IMPORT_RE = /(?:\bimport\s*(?:[^'";]*?\s+from\s*)?|\bexport\s+[^'";]*?\s+from\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;

function resolveModule(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = path.extname(base)
    ? [base, base.replace(/\.js$/, '.ts')]
    : [base, base + '.js', base + '.ts', base + '.mjs'];
  const found = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!found) throw new Error(`Cannot resolve import "${specifier}" from ${path.relative(ROOT, fromFile)}`);
  return found;
}

function outputPath(source) {
  const rel = path.relative(ROOT, source);
  return path.join(DIST, rel.replace(/\.ts$/, '.js'));
}

function relativeImport(fromOutput, toOutput) {
  let rel = path.relative(path.dirname(fromOutput), toOutput).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function compileClosure(entry) {
  const visited = new Set();
  function visit(source) {
    if (visited.has(source)) return;
    visited.add(source);
    const raw = fs.readFileSync(source, 'utf8');
    const isTS = /\.ts$/.test(source);
    let code = isTS ? stripTypeScriptTypes(raw, { mode: 'transform' }) : raw;
    const replacements = [];
    for (const match of code.matchAll(IMPORT_RE)) {
      const specifier = match[1];
      const dependency = resolveModule(source, specifier);
      if (!dependency) continue;
      visit(dependency);
      replacements.push({ start: match.index + match[0].lastIndexOf(specifier), end: match.index + match[0].lastIndexOf(specifier) + specifier.length, value: relativeImport(outputPath(source), outputPath(dependency)) + '?v=' + BUILD_ID });
    }
    for (const replacement of replacements.reverse()) {
      code = code.slice(0, replacement.start) + replacement.value + code.slice(replacement.end);
    }
    const target = outputPath(source);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, code);
  }
  visit(entry);
}

if (!fs.existsSync(ENTRY)) throw new Error('Missing party/main.js; create the party client entry before building.');
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'vendor'), { recursive: true });
compileClosure(ENTRY);
fs.writeFileSync(path.join(DIST, 'index.html'),fs.readFileSync(path.join(ROOT,'party','index.html'),'utf8').replace('/party/main.js"','/party/main.js?v='+BUILD_ID+'"').replace('/party/styles.css"','/party/styles.css?v='+BUILD_ID+'"'));
fs.mkdirSync(path.join(DIST, 'party'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'party', 'styles.css'), path.join(DIST, 'party', 'styles.css'));
fs.copyFileSync(path.join(ROOT, 'vendor', 'three.module.min.js'), path.join(DIST, 'vendor', 'three.module.min.js'));
fs.cpSync(path.join(ROOT, 'vendor', 'addons'), path.join(DIST, 'vendor', 'addons'), { recursive: true });

const world = await import('../server/party.mjs');
const worldNames = ['SPAWN', 'LANTERN_PICKUPS', 'BRIDGE_CHECKPOINTS', 'SKY_RINGS', 'INGREDIENTS', 'CAKE_SPOT', 'PARTY_ARENA', 'ARENA_COVER', 'JOURNEY_CATALOG', 'JOURNEY_INFO'];
const worldData = Object.fromEntries(worldNames.filter(name => name in world).map(name => [name, world[name]]));
fs.writeFileSync(path.join(DIST, 'party', 'world.json'), JSON.stringify(worldData, null, 2) + '\n');
fs.copyFileSync(path.join(ROOT, 'vendor', 'LICENSE.three'), path.join(DIST, 'vendor', 'LICENSE.three'));
console.log(`Built party client with ${countFiles(path.join(DIST, 'party'))} party files.`);

function countFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((count, item) => count + (item.isDirectory() ? countFiles(path.join(dir, item.name)) : 1), 0);
}
