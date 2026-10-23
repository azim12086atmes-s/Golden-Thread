const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.resolve(process.env.CAPTURE_TOOLS,'node_modules/playwright'));
const out=path.resolve('palace-captures');fs.mkdirSync(out,{recursive:true});
const report={sourceCommit:'cd7df6fe1fafd30b0939d2f7fbd2a307525404ca',browser:'Chromium / SwiftShader WebGL',captures:[],errors:[],checks:{}};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=await context.newPage();page.setDefaultTimeout(180000);
 page.on('pageerror',e=>report.errors.push({type:'page',message:String(e)}));
 page.on('console',m=>{if(m.type()==='error')report.errors.push({type:'console',message:m.text().slice(0,3500)});});
 page.on('requestfailed',r=>report.errors.push({type:'request',url:r.url(),message:r.failure()?.errorText}));
 // This review-only hook changes the game's existing attract-camera parameter.
 // Geometry, materials, lights, shaders, movement and the actual frame loop remain the source build.
 await page.route('**/js/main.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+'\nwindow.__reviewCamera = c => params.set("cam",c.join(","));\n'});});
 await page.goto('http://127.0.0.1:8012/?quality=high&dusk=1&cam=3000,2500,4200,0,1050,0,60',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__castle?.palaceGardens);
 report.checks=await page.evaluate(async()=>{
  const {palaceGardens:g}=window.__castle, layout=await import('/js/world/layout.js');
  const points=[...layout.PORTALS,...window.__castle.game?.portals||[]];
  points.push({x:0,z:layout.GATE.z,y:layout.CASTLE.y});
  points.push({x:-150*layout.S,z:505*layout.S,y:layout.PAL.y});
  const blockedRoutes=points.filter(p=>g.bedAt(p.x,p.z,p.y+2)).map(p=>({x:p.x,y:p.y,z:p.z}));
  const invalidBeds=g.beds.filter(b=>![b.x,b.y,b.z,b.a,b.b,b.angle].every(Number.isFinite)||b.a<=0||b.b<=0);
  const stats=g.group.userData.gardenStats;
  const palette=()=>({stone:true,sourceGeometry:true});
  const close=g.beds.filter(b=>b.y>1300&&b.z>-600&&b.z<200).sort((a,b)=>(Math.hypot(a.x+192.5,a.z+412.5)-Math.hypot(b.x+192.5,b.z+412.5)));
  const bed=close[0]||g.beds[0];
  let triangles=0,meshes=0;
  g.group.traverse(o=>{if(o.isMesh){meshes++;const n=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;triangles+=n*(o.isInstancedMesh?o.count:1);}});
  return {stats,blockedRoutes,invalidBeds:invalidBeds.length,staticGardenTriangles:triangles,gardenMeshes:meshes,
   selectedBed:bed&&{x:bed.x,y:bed.y,z:bed.z,a:bed.a,b:bed.b},palaceBase:layout.PAL.y,gateSill:layout.CASTLE.y};
 });
 if(report.checks.stats.beds<35)throw new Error('Too few planted garden rooms: '+report.checks.stats.beds);
 if(report.checks.blockedRoutes.length||report.checks.invalidBeds)throw new Error('Planting route/floor validation failed');
 console.log('Garden validation '+JSON.stringify(report.checks));
 await page.addStyleTag({content:'body *{visibility:hidden!important} canvas{visibility:visible!important}'});
 async function shot(file,cam,waitPlants=false) {
  await page.evaluate(cam=>window.__reviewCamera(cam),cam);
  await delay(9000);
  if(waitPlants)await page.waitForFunction(()=>window.__castle.palaceGardens.group.children.some(o=>o.isInstancedMesh&&o.geometry.attributes.tip&&o.count>100),null,{timeout:60000});
  await page.locator('canvas').first().screenshot({path:path.join(out,file),timeout:120000});
  const plants=await page.evaluate(()=>window.__castle.palaceGardens.group.children.filter(o=>o.isInstancedMesh&&o.geometry.attributes.tip).map(o=>({name:o.name||'plants',count:o.count,visible:o.visible})));
  report.captures.push({file,cam,plants});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('Captured '+file);
 }
 await shot('palace-gardens-exterior.png',[3000,2500,4200,0,1050,0,60]);
 await shot('palace-courtyard-eye-level.png',[-153,1395.3,-351,-207,1393.8,-412.5,62]);
 const b=report.checks.selectedBed;
 await shot('palace-planted-promenade.png',[b.x,b.y+3.2,b.z+b.b+8,b.x,b.y+1.7,b.z-24,63],true);
 report.checks.shaderErrors=report.errors.filter(e=>/shader|compile|WebGL|GLSL/.test(e.message||'')).length;
 await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 if(report.errors.length)process.exitCode=1;
})().catch(e=>{report.errors.push({type:'fatal',message:String(e)});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
