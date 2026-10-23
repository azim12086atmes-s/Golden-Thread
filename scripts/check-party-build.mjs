import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const IMPORT_RE = /(?:\bimport\s*(?:[^'";]*?\s+from\s*)?|\bexport\s+[^'";]*?\s+from\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };

if (!fs.existsSync(path.join(DIST, 'index.html'))) errors.push('dist/index.html is missing; run scripts/build-party.mjs first.');
const files = fs.existsSync(DIST) ? allFiles(DIST) : [];
const relativeFiles = files.map(file => path.relative(DIST, file).split(path.sep).join('/'));
const fileSet = new Set(relativeFiles);
check(fileSet.has('party/main.js'), 'dist/party/main.js is missing.');
check(fileSet.has('party/world.json'), 'dist/party/world.json is missing.');
check(fileSet.has('vendor/three.module.min.js'), 'Vendored Three.js module is missing.');
check(fileSet.has('vendor/addons/utils/BufferGeometryUtils.js'), 'BufferGeometryUtils is missing.');
check(fileSet.has('src/ui/styles.css'), 'Scoped original Golden Thread UI stylesheet is missing.');
check(!relativeFiles.some(file => file.startsWith('scripts/')), 'Build output must not contain scripts/.');
check(!relativeFiles.some(file => /(?:^|\/)(?:invites?|private|party-config)(?:[-_.\/]|$)/i.test(file)), 'Build output contains a private invitation/config file path.');
check(!fileSet.has('src/main.js'), 'Build output contains the original runnable single-player entry src/main.js.');
check(!fileSet.has('main.js'), 'Build output contains a root-level runnable entry.');
check(!relativeFiles.some(file => /(?:^|\/)private-config(?:[-_.\/]|$)/i.test(file)), 'Build output contains a private config path.');

const htmlPath = path.join(DIST, 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const uiMounts = [...html.matchAll(/<([a-z][\w:-]*)\b(?=[^>]*\bid\s*=\s*(['"])ui\2)[^>]*>/gi)];
  check(uiMounts.length === 0, `Party HTML must not contain a placeholder #ui mount; original UI creates its live root at runtime (found ${uiMounts.length}).`);
  check(html.includes('/src/ui/styles.css'), 'Party HTML does not load the scoped original UI stylesheet.');
  check(html.includes('"three/examples/jsm/":"/vendor/addons/"'), 'Import map is missing the examples/jsm addon alias.');
}

const compiledUI = path.join(DIST, 'src', 'ui', 'UI.js');
if (fs.existsSync(compiledUI)) {
  const uiCode = fs.readFileSync(compiledUI, 'utf8');
  const liveRoots = [...uiCode.matchAll(/\bid\s*:\s*(['"])ui\1/g)];
  check(liveRoots.length === 1, `Compiled original UI must create exactly one #ui root (found ${liveRoots.length}).`);
  check(/document\.body\.append\(this\.root\)/.test(uiCode), 'Original UI root is not attached to the document body.');
} else check(false, 'Compiled original UI class is missing from the party module closure.');

const scopedCss = path.join(DIST, 'src', 'ui', 'styles.css');
if (fs.existsSync(scopedCss)) {
  const css = fs.readFileSync(scopedCss, 'utf8');
  check(/@scope\s*\(#ui\)/.test(css), 'Original UI stylesheet is not scoped to #ui.');
  check(!/(?:^|\n)\s*:root\s*\{/m.test(css), 'Original UI stylesheet still applies variables globally at :root.');
}

const coreModules = [
  'src/Game.js', 'src/ui/UI.js', 'src/world/World.js', 'src/world/Meadow.js',
  'src/world/foliage.js', 'src/world/wind.js', 'src/world/Weather.js', 'src/world/Atmos.js',
  'src/world/CityScreens.js', 'src/world/FestivalAir.js', 'src/world/TownDressing.js',
  'src/traffic/Traffic.js', 'src/event/Festivities.js', 'src/event/Celebration.js',
  'src/event/CelebrationScene.js', 'src/event/Chariot.js', 'src/player/Travellers.js',
  'src/characters/CharacterModel.js', 'src/characters/outfits.js', 'src/quests/QuestSystem.js',
  'src/economy/economy.js', 'src/housing/HousingView.js', 'src/social/Messages.js',
  'src/world/Sky.js', 'src/world/SkyFX.js', 'src/world/SkyOrnaments.js', 'src/world/PartyAir.js',
  'src/world/RegionBuilder.js', 'src/world/WonderSites.js', 'src/animals/Animals.js',
  'src/npc/Npcs.js', 'src/caravan/CaravanView.js', 'src/story/CakeScene.js',
];
for (const required of coreModules) check(fileSet.has(required), `Original game dependency is absent from the party module closure: ${required}`);
const compiledSourceModules = relativeFiles.filter(file => /^src\/.*\.js$/.test(file));
check(compiledSourceModules.length >= 200, `Party closure is unexpectedly small (${compiledSourceModules.length} compiled src modules; expected at least 200).`);

for (const file of files.filter(file => /\.m?js$/.test(file) && !file.includes(`${path.sep}vendor${path.sep}`))) {
  const code = fs.readFileSync(file, 'utf8');
  for (const match of code.matchAll(IMPORT_RE)) {
    const target = match[1];
    check(!/\.css(?:[?#]|$)/i.test(target), `CSS must be loaded by a stylesheet link, not a JavaScript module: ${target}`);
    check(!/\.ts(?:[?#]|$)/i.test(target), `Unresolved TypeScript import in ${path.relative(DIST, file)}: ${target}`);
    if (!target.startsWith('.')) {
      if (target === 'three') check(fileSet.has('vendor/three.module.min.js'), 'Import map target for "three" is missing.');
      else if (target.startsWith('three/addons/')) check(fileSet.has('vendor/addons/' + target.slice('three/addons/'.length)), `Import map target for "${target}" is missing.`);
      else if (target.startsWith('three/examples/jsm/')) check(fileSet.has('vendor/addons/' + target.slice('three/examples/jsm/'.length)), `Import map target for "${target}" is missing.`);
      else check(false, `Unsupported bare import in browser output: ${target} (${path.relative(DIST, file)}).`);
      continue;
    }
    const resolved = path.resolve(path.dirname(file), target.split('?')[0]);
    check(resolved.startsWith(DIST + path.sep), `Import escapes dist: ${path.relative(DIST, file)} -> ${target}`);
    check(fs.existsSync(resolved), `Missing import target: ${path.relative(DIST, file)} -> ${target}`);
  }
}

checkSourceIntegrity();

if (errors.length) {
  console.error(errors.map(error => `✗ ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Party build contract passed (${files.length} emitted files; ${compiledSourceModules.length} original src modules).`);
}

function checkSourceIntegrity() {
  const manifestPath = path.join(ROOT, 'SOURCE_MANIFEST.json');
  if (!fs.existsSync(manifestPath)) { errors.push('SOURCE_MANIFEST.json is missing.'); return; }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const srcFiles = (manifest.files || []).filter(item => item.path.startsWith('src/'));
  check(srcFiles.length === 211, `Expected 211 pinned src entries in SOURCE_MANIFEST.json, found ${srcFiles.length}.`);
  const approved = new Set([
    'src/Game.ts', 'src/event/Celebration.ts', 'src/player/Travellers.ts',
    'src/ui/UI.ts', 'src/world/terrain.ts',
    'src/characters/CharacterModel.ts',
  ]);
  const changed = [];
  for (const entry of srcFiles) {
    const fullPath = path.join(ROOT, entry.path);
    if (!fs.existsSync(fullPath)) { errors.push(`Pinned source file is missing: ${entry.path}`); continue; }
    const bytes = fs.readFileSync(fullPath);
    const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (hash !== entry.sha) changed.push(entry.path);
  }
  for (const file of changed) check(approved.has(file), `Unapproved edit to pinned original source: ${file}`);
  for (const file of approved) check(changed.includes(file), `Expected approved party integration edit is absent: ${file}`);
}

function allFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const full = path.join(dir, item.name);
    return item.isDirectory() ? allFiles(full) : [full];
  });
}
