import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const values = (flag) => args.flatMap((v, i) => v === flag && i + 1 < args.length ? [args[i + 1]] : []);
const has = (flag) => args.includes(flag);
const value = (flag, fallback) => values(flag).at(-1) ?? fallback;
const out = path.resolve(value('--out', path.join(root, '..', 'starlight-private')));
if (out === root || out.startsWith(root + path.sep)) throw new Error('Save invitations outside the repository.');

function normalizeBase(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('Use your server’s HTTP or HTTPS origin.'); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash || u.pathname !== '/') {
    throw new Error('Use your server’s HTTP or HTTPS origin, without a path, query, or fragment.');
  }
  return u.origin;
}

function utcDate(raw) {
  if (raw == null) return null;
  const time = Date.parse(raw);
  if (!Number.isFinite(time)) throw new Error('Use a valid ISO date/time for --date.');
  return new Date(time).toISOString();
}

const base = normalizeBase(value('--base', 'http://localhost:3000'));
const guests = Number(value('--guests', 14));
if (!Number.isInteger(guests) || guests < 0 || guests > 200) throw new Error('--guests must be an integer from 0 to 200.');
const companionNames = values('--companion').map((s) => String(s).trim()).filter(Boolean);
const requestedCompanions = Number(value('--companions', companionNames.length));
if (!Number.isInteger(requestedCompanions) || requestedCompanions < companionNames.length || requestedCompanions < 0 || requestedCompanions > 30) {
  throw new Error('--companions must be an integer from the number of named companions to 30.');
}

fs.mkdirSync(out, { recursive: true, mode: 0o700 });
try { fs.chmodSync(out, 0o700); } catch { /* Existing private directory permissions may be managed externally. */ }
const configPath = path.join(out, 'party.json');
const slot = (role, name, avatar) => ({ id: randomBytes(12).toString('base64url'), role, name, avatar, token: randomBytes(32).toString('base64url') });
const normalizedName = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '');
const explicitObserver = has('--observer');
const observerName = explicitObserver ? String(value('--observer', '')).trim() : null;
if (explicitObserver && !observerName) throw new Error('--observer needs a name.');
const birthdayName = has('--birthday') ? String(value('--birthday', '')).trim() : null;
if (has('--birthday') && !birthdayName) throw new Error('--birthday needs a name.');
const requestedDate = has('--date') ? utcDate(value('--date', null)) : undefined;

let config;
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config || !Array.isArray(config.slots)) throw new Error('Existing party.json must contain a slots array.');
  const birthday = config.slots.find((s) => s.role === 'birthday');
  if (!birthday) throw new Error('Existing party.json has no birthday slot.');
  if (birthdayName !== null) birthday.name = birthdayName;

  let observer = null;
  if (explicitObserver) {
    observer = config.slots.find((s) => s.role === 'observer' && normalizedName(s.name) === normalizedName(observerName))
      ?? config.slots.find((s) => s.role === 'companion' && normalizedName(s.name) === normalizedName(observerName));
    if (observer) {
      const previousObserver = config.slots.find((s) => s.role === 'observer' && s !== observer);
      if (previousObserver && observer.role === 'companion') previousObserver.role = 'companion';
      observer.role = 'observer';
      observer.name = observerName;
      observer.avatar = 'b-kurta-jeans';
    }
  } else {
    observer = config.slots.find((s) => s.role === 'observer') ?? null;
  }
  if (!observer) config.slots.push(slot('observer', observerName ?? 'Observer', 'b-kurta-jeans'));

  // Explicit named companions are additive and idempotent by normalized name.
  for (const name of companionNames) {
    if (!config.slots.some((s) => s.role === 'companion' && normalizedName(s.name) === normalizedName(name))) {
      config.slots.push(slot('companion', name, 'g-kurti-jeans'));
    }
  }
  const companionCount = config.slots.filter((s) => s.role === 'companion').length;
  for (let i = companionCount; i < requestedCompanions; i++) {
    config.slots.push(slot('companion', `Private companion ${i + 1}`, i % 2 ? 'b-kurta-jeans' : 'g-kurti-jeans'));
  }
  if (requestedDate !== undefined) config.celebrationStart = requestedDate;
} else {
  config = {
    celebrationStart: requestedDate ?? null,
    slots: [
      slot('birthday', birthdayName ?? 'Birthday guest', 'g-kurti-jeans'),
      slot('observer', observerName ?? 'Observer', 'b-kurta-jeans'),
    ],
  };
  for (let i = 0; i < requestedCompanions; i++) {
    const name = companionNames[i] ?? `Private companion ${i + 1}`;
    config.slots.push(slot('companion', name, i % 2 ? 'b-kurta-jeans' : 'g-kurti-jeans'));
  }
}

if (config.dynamicGuests === undefined) config.dynamicGuests = true;
if (config.maxConnections === undefined) config.maxConnections = 32;
if (config.celebrationStart !== undefined && config.celebrationStart !== null) config.celebrationStart = utcDate(config.celebrationStart);

// Write safely outside the source tree and replace only the organizer's private file.
const configTemp = path.join(out, `.party-${process.pid}-${randomBytes(4).toString('hex')}.tmp`);
fs.writeFileSync(configTemp, JSON.stringify(config, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
fs.renameSync(configTemp, configPath);
try { fs.chmodSync(configPath, 0o600); } catch { /* Respect filesystem policy if chmod is unavailable. */ }

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const privateSlots = config.slots.filter((s) => ['birthday', 'observer', 'companion'].includes(s.role));
const privateRows = privateSlots.map((s) => ({
  name: s.name, role: s.role, suffix: `/#invite=${encodeURIComponent(s.token)}`,
  detail: s.role === 'observer' ? 'View only: follows the birthday player; private voice is available.' : '',
}));
const guestRows = Array.from({ length: guests }, (_, i) => ({
  name: `Guest link ${i + 1}`, role: 'numbered guest link', suffix: `/?guest=${i + 1}`,
  detail: 'Anyone with this link may join as a guest. Each guest can use any unique number from 0 to 9999999999.',
}));
const allRows = [...privateRows, ...guestRows];
const markdown = [
  '# Private invitation register',
  '',
  'Keep this file private. Share only the individual private link intended for each person.',
  '',
  `Server: ${base}`,
  '',
  '## Private invitations',
  ...privateRows.map((s) => `- **${s.name}** (${s.role}) — ${base}${s.suffix}${s.detail ? ` — ${s.detail}` : ''}`),
  ...(privateSlots.some((s) => s.role === 'companion') ? [] : ['- **Private companion** — Not invited.']),
  '',
  '## Numbered guest links',
  'Guest links are public numbered URLs and do not consume a private invitation slot. A number may be any unique integer from 0 to 9999999999.',
  ...guestRows.map((s) => `- **${s.name}** — ${base}${s.suffix}`),
  '',
].join('\n');
fs.writeFileSync(path.join(out, 'links.md'), markdown, { mode: 0o600 });

const article = (s) => `<article><strong>${escape(s.name)}</strong> <small>(${escape(s.role)})</small>${s.detail ? `<p>${escape(s.detail)}</p>` : ''}<p><a data-tail="${escape(s.suffix)}" href="${escape(base + s.suffix)}">Open invitation ↗</a></p><input readonly data-tail="${escape(s.suffix)}" value="${escape(base + s.suffix)}" aria-label="${escape(s.name)} link"></article>`;
const html = `<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private birthday invitations</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;padding:24px;background:#19142b;color:#f7ead7}h1{font:40px Georgia}h2{margin-top:42px}article{border-top:1px solid #ffffff20;padding:16px 0}a{color:#edcd92;overflow-wrap:anywhere}small,.note{color:#b9adc6}input{box-sizing:border-box;width:100%;padding:12px;margin-top:8px;background:#2c233f;color:#eee;border:1px solid #ffffff30}button{padding:12px 16px;margin:8px 0;background:#edcd92;color:#211a2d;border:0;border-radius:8px;font-weight:700}#host{max-width:600px}</style><h1>Private birthday invitations</h1><p>For the organiser only. Send each private link only to its intended person.</p><p class="note">Private links use a token in the URL fragment. The observer link is view only, follows the birthday player, and may use private voice.</p><label for="host">Party server address</label><input id="host" value="${escape(base)}" aria-label="Party server address"><button id="rewrite" type="button">Update all links for this host</button><p id="status" class="note">Guest links use a numbered URL; guests may use any unique number from 0 to 9999999999. The displayed links are convenient examples.</p><section><h2>Private invitations</h2>${privateRows.map(article).join('')}${privateSlots.some((s) => s.role === 'companion') ? '' : '<article><strong>Private companion</strong><p class="note">Not invited</p></article>'}</section><section><h2>Numbered guest links (${guests} examples)</h2><p>These are ordinary guest links and do not require a private token or fixed guest slot.</p>${guestRows.map(article).join('')}</section><script>(()=>{const input=document.querySelector('#host'),status=document.querySelector('#status');document.querySelector('#rewrite').addEventListener('click',()=>{try{const u=new URL(input.value.trim());if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname!=='/'){throw Error()}const base=u.origin;document.querySelectorAll('[data-tail]').forEach(el=>{const link=base+el.dataset.tail;if(el.tagName==='A')el.href=link;else el.value=link});status.textContent='All private and numbered guest links now use '+base+'.';}catch{status.textContent='Enter an HTTP or HTTPS server origin without a path, query, or fragment.';}});})();</script>`;
fs.writeFileSync(path.join(out, 'invitations.html'), html, { mode: 0o600 });
try {
  fs.chmodSync(path.join(out, 'links.md'), 0o600);
  fs.chmodSync(path.join(out, 'invitations.html'), 0o600);
} catch { /* Private output is still created with mode 0600. */ }
console.log(`Prepared ${privateRows.length} private invitations and ${guestRows.length} numbered guest links in ${out}. Server origin: ${base}. Invitation tokens were not printed.`);
