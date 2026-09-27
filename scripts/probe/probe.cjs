// Usage: node probe.cjs <script.js>  — runs the script body inside the page with `dev`, `game`, `shot(name)` available.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const body = fs.readFileSync(require('path').join(__dirname, 'prelude.js'),'utf8') + '\n' + fs.readFileSync(process.argv[2], 'utf8');
  const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 5191) + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.dev, null, { timeout: 90000 });
  await page.waitForTimeout(4000);
  await page.waitForFunction(() => window.dev, null, { timeout: 90000 });
  await page.exposeFunction('shotNode', async (name, data) => { fs.writeFileSync(`${process.env.SHOTS || 'shots'}/${name}.png`, Buffer.from(data.split(',')[1], 'base64')); });
  const out = await page.evaluate(`(async () => { const dev = window.dev, game = dev.game; const shot = (n) => { game.composer.render(); const canvas = game.composer.renderer?.domElement || document.querySelector('canvas'); return window.shotNode(n, canvas.toDataURL('image/png')); }; ${body} })()`);
  console.log(JSON.stringify(out, null, 1));
  console.log(logs.slice(0, 20).join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
