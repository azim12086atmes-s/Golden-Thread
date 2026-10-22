const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.resolve(process.env.CAPTURE_TOOLS, 'node_modules/playwright'));
const out = path.resolve('browser-captures');
fs.mkdirSync(out, {recursive:true});
const report = {
  method: 'Actual full games in headless Chromium with SwiftShader WebGL; source reference review, not target-device performance or multiplayer QA.',
  goldenCommit:'a6c20a4f9ceabec4fbd544ca7c73658b005c2318',
  castleCommit:'3fcc2b4728c51eca871c889fa545c9605d7ad8df',
  captures:[], errors:[]
};
const delay = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser = await chromium.launch({headless:true, args:[
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--enable-webgl','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage'
  ]});
  async function capture(spec) {
    const context = await browser.newContext({viewport:{width:1280,height:800}, deviceScaleFactor:1});
    const page = await context.newPage();
    const row = {file:spec.file, url:spec.url, pageErrors:[], consoleErrors:[], failedRequests:[]};
    page.on('pageerror',e=>row.pageErrors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error') row.consoleErrors.push(m.text().slice(0,1200));});
    page.on('requestfailed',r=>row.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
    try {
      page.setDefaultTimeout(90000);
      if (spec.seed) await context.addInitScript(seed=>{
        try {localStorage.clear();localStorage.setItem('golden-thread/save/v1',JSON.stringify(seed));localStorage.setItem('golden-thread/quality','high');}catch{}
      },spec.seed);
      const response=await page.goto(spec.url,{waitUntil:'domcontentloaded',timeout:90000});
      row.httpStatus=response?.status();
      if (!response?.ok()) throw new Error('Page HTTP '+response?.status());
      if(spec.seed) {
        const start=page.locator('.title button.primary');
        await start.waitFor({state:'visible'});
        await page.waitForFunction(()=>{const b=document.querySelector('.title button.primary');return b&&!b.disabled;},null,{timeout:120000});
        await start.click({timeout:90000});
        await page.locator('.title').waitFor({state:'detached',timeout:30000});
        await delay(9000);
      } else {
        await page.waitForFunction(()=>!!window.__castle,null,{timeout:150000});
        await delay(8000);
        row.renderer=await page.evaluate(()=>{
          const r=window.__castle.renderer;
          const gl=r.getContext();
          return {info:r.info.render, webglVersion:gl.getParameter(gl.VERSION),camera:window.__castle.camera.position.toArray()};
        });
      }
      await page.addStyleTag({content:'body * { visibility: hidden !important; } canvas { visibility: visible !important; }'});
      await delay(1500);
      const canvas=page.locator('canvas').first();
      await canvas.screenshot({path:path.join(out,spec.file),timeout:90000});
      row.success=true;
      console.log('Captured '+spec.file);
    } catch(e) {
      row.success=false;row.error=String(e);report.errors.push({file:spec.file,error:String(e)});
      console.error('Capture failed '+spec.file+': '+e);
      try {await page.screenshot({path:path.join(out,spec.file.replace('.png','-failure.png')),timeout:20000});}catch{}
    } finally {
      report.captures.push(row);
      fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
      await context.close();
    }
  }
  const seed={version:1,names:{girl:'Traveller',boy:'Companion'},minutes:14*60,
    flags:['story-5','thread-tied','cake'],quests:{'main-meadow':{status:'done',step:0,count:0}},
    tour:{off:true,later:[]},playSeconds:10};
  const golden='https://azim12086atmes-s.github.io/Golden-Thread/versions/a6c20a4/';
  if (process.env.CAPTURE_SET !== 'palace-day') await capture({file:'golden-current-meadow.png',url:golden,seed});
  if (process.env.CAPTURE_SET !== 'palace-day') await capture({file:'golden-current-grass.png',url:golden,seed:{...seed,player:{x:110,y:0,z:275,heading:Math.PI}}});
  const castle='http://127.0.0.1:8012/';
  await capture({file:'castle-large-exterior-day.png',url:castle+'?quality=high&dusk=1&cam=3000,2500,4200,0,1050,0,60'});
  await capture({file:'castle-large-courtyard-day.png',url:castle+'?quality=high&dusk=1&cam=-110,1505,-180,-192.5,1391.5,-412.5,55'});
  await capture({file:'castle-authored-meadow-day.png',url:castle+'?quality=high&dusk=1&cam=7614,1158,11912,7584,1156,11865,60'});
  await capture({file:'castle-approach-day.png',url:castle+'?quality=high&dusk=1&cam=0,22,6100,0,1050,0,58'});
  await browser.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  if(report.errors.length) process.exitCode=1;
})().catch(e=>{console.error(e);report.errors.push({fatal:String(e)});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));process.exitCode=1;});
