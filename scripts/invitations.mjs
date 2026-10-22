import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function values(flag) { return args.flatMap((v,i) => v === flag ? [args[i+1]] : []); }
const value = (flag, fallback) => values(flag).at(-1) ?? fallback;
const out = path.resolve(value('--out', path.join(root, '..', 'starlight-private')));
if (out === root || out.startsWith(root + path.sep)) throw new Error('Save invitations outside the repository.');
const origin = new URL(value('--base', 'http://localhost:3000'));
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash) throw new Error('Use your server’s HTTP or HTTPS origin.');
const base = origin.href.replace(/\/$/, '');
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const configPath = path.join(out, 'party.json');
let config;
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  const names = values('--companion');
  const companions = Number(value('--companions', names.length || 3));
  const guests = Number(value('--guests', 13 - companions));
  if (!Number.isInteger(companions) || !Number.isInteger(guests) || companions < names.length || companions < 0 || guests < 0 || 1 + companions + guests > 14) throw new Error('Choose at most 14 slots, including the birthday guest and companions.');
  const slot = (role, name, avatar) => ({ id: randomBytes(12).toString('base64url'), role, name, avatar, token: randomBytes(32).toString('base64url') });
  config = { celebrationStart: value('--date', null), slots: [slot('birthday', value('--birthday', 'Birthday guest'), 'g-star')] };
  for (let i=0;i<companions;i++) config.slots.push(slot('companion', names[i] || `Private companion ${i+1}`, i===0?'b-moon':'g-petal'));
  for (let i=0;i<guests;i++) config.slots.push(slot('guest', `Guest ${String(i+1).padStart(2,'0')}`, i%2?'g-petal':'b-sherwani'));
  fs.writeFileSync(configPath, JSON.stringify(config,null,2)+'\n', { mode:0o600, flag:'wx' });
}
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows = config.slots.map(slot => ({ ...slot, link: `${base}/#invite=${encodeURIComponent(slot.token)}` }));
const markdown = '# Private invitation register\n\nKeep this file private. Share only the individual link intended for each person.\n\n'+rows.map((s,i)=>`${i+1}. **${s.name}** (${s.role}) — ${s.link}`).join('\n')+'\n';
fs.writeFileSync(path.join(out,'links.md'),markdown,{mode:0o600});
const html='<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Private birthday invitations</title><style>body{font:16px system-ui;max-width:850px;margin:50px auto;padding:24px;background:#19142b;color:#f7ead7}h1{font:44px Georgia}article{border-top:1px solid #ffffff20;padding:18px 0}a{color:#edcd92;overflow-wrap:anywhere}small{color:#b9adc6}input{width:100%;padding:12px;margin-top:10px;background:#2c233f;color:#eee;border:1px solid #ffffff30}</style><h1>Your private invitation register.</h1><p>For the organiser only. Send each player only their own link.</p><p><small>These links use '+escape(base)+'. They work when the party server is running at that address. Re-run the invitation command with --base after deployment; existing tokens stay the same.</small></p>'+rows.map(s=>'<article><strong>'+escape(s.name)+'</strong> <small>('+escape(s.role)+')</small><p><a href="'+escape(s.link)+'">Open this invitation ↗</a></p><input readonly value="'+escape(s.link)+'" aria-label="Invitation link"></article>').join('');
fs.writeFileSync(path.join(out,'invitations.html'),html,{mode:0o600});
console.log(`Prepared ${rows.length} unique invitations in ${out}. Server origin: ${base}. Invitation tokens were not printed. Existing configuration is preserved.`);
