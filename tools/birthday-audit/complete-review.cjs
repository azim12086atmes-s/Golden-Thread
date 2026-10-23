const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.env.CAPTURE_TOOLS,'node_modules/playwright'));
const out='browser-captures';fs.mkdirSync(out,{recursive:true});
const report={method:'Actual current Game plus party adapter; Chromium SwiftShader; HTTP sessions are not 14 hardware renderers or a microphone test.',errors:[],captures:[],checks:{}};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const base='http://127.0.0.1:8013';
let uiOnly=process.env.REVIEW_MODE==='ui';
if(process.env.REVIEW_MODE==='auto'){
 try{const changed=require('node:child_process').execFileSync('git',['diff','--name-only','HEAD^','HEAD'],{encoding:'utf8'}).trim().split('\n');uiOnly=changed.every(p=>/^(?:party\/golden-ui\.css|tools\/birthday-audit\/complete-review\.cjs|\.github\/workflows\/complete-birthday-review\.yml)$/.test(p));}catch{}
}
report.mode=uiOnly?'UI repair; palace walk-through and birthday projection retained from the preceding full review':'complete world';
const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
let browser;
(async()=>{
 for(let i=0;i<30;i++){try{const r=await fetch(base);if(r.ok)break;}catch{}await delay(500);}
 const fixtures=JSON.parse(fs.readFileSync('.review-fixture.json','utf8'));
 const join=async body=>{const r=await fetch(base+'/api/join',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert(r.ok,'Review join failed '+r.status);return r.json();};
 const sessions=[];
 for(const slot of fixtures.slots)sessions.push(await join({token:slot.token}));
 for(let i=1;i<=13;i++)sessions.push(await join({guestNumber:String(i),name:'Guest '+i}));
 const views=await Promise.all(sessions.map(async s=>{const r=await fetch(base+'/api/state?ticket='+encodeURIComponent(s.ticket));assert(r.ok,'State review failed '+r.status);return r.json();}));
 const guestView=views.find(v=>v.self.id==='numbered-1')||views.find(v=>v.self.role==='guest');
 const birthdayView=views.find(v=>v.self.role==='birthday');
 assert(guestView&&birthdayView);
 assert.equal(guestView.players.length,14,'There should be 14 visible public players');
 assert(!JSON.stringify(guestView).includes('review-observer'),'Observer identity leaked to public view');
 assert(!JSON.stringify(guestView).includes('review-sibling-'),'Private siblings leaked to public view');
 assert(birthdayView.players.some(p=>p.id==='review-observer'));
 report.checks.sessions={connected:sessions.length,publicPlayers:guestView.players.length,privateProjection:true};save();
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage']});
 async function open(url){
  const context=await browser.newContext({viewport:{width:1360,height:850},deviceScaleFactor:1});const page=await context.newPage();page.setDefaultTimeout(180000);
  page.on('pageerror',e=>{report.errors.push({type:'page',message:String(e)});save();});
  page.on('console',m=>{if(m.type()==='error'){report.errors.push({type:'console',message:m.text().slice(0,2500)});save();}});
  await page.goto(base+url,{waitUntil:'domcontentloaded'});return{context,page};
 }
 async function waitForGame(page){
  if(report.errors.length)throw new Error('Browser startup failed: '+report.errors.at(-1).message);
  let consoleError,pageError;
  const failed=new Promise((resolve,reject)=>{consoleError=m=>{if(m.type()==='error')reject(new Error(m.text()));};pageError=e=>reject(e);page.on('console',consoleError);page.on('pageerror',pageError);});
  try{await Promise.race([page.waitForFunction(()=>window.partyTest?.game?.core?.ready===true),failed]);}
  finally{page.off('console',consoleError);page.off('pageerror',pageError);}
 }
 const {context,page}=await open('?guest=1');await page.locator('#join').click();
 await waitForGame(page);
 // Pin the visual inspection to the original high mode on the software renderer.
 await page.evaluate(()=>{const g=partyTest.game.core;g.adapt=()=>{};g.setQuality('high');});
 report.checks.ui=await page.evaluate(()=>({uiRoots:document.querySelectorAll('#ui').length,personalNarrative:partyTest.game.core.allowPersonalNarrative,hiddenSiblingModels:partyTest.game.core.caravan.bodies.filter(b=>b.def.kind==='sibling').length,wardrobe:Object.keys(partyTest.game.core.st.outfits)}));
 assert.equal(report.checks.ui.uiRoots,1);assert.equal(report.checks.ui.hiddenSiblingModels,0);assert.equal(report.checks.ui.personalNarrative,false);
 async function shot(file){report.checks.lastCapture={file,position:await page.evaluate(()=>partyTest.game.pos.toArray())};save();await page.screenshot({path:path.join(out,file),timeout:120000});report.captures.push(file);save();console.log('Captured '+file);}
 await page.evaluate(()=>{const g=partyTest.game.core;g.st.minutes=14*60;g.trav.teleport(0,70);g.trav.camYaw=Math.PI;g.trav.camPitch=.16;g.trav.camDist=7;});
 await delay(12000);await shot('golden-full-world-meadow.png');
 report.checks.meadowView=await page.evaluate(async()=>{const g=partyTest.game.core,T=await import('three'),targets=[];g.scene.traverseVisible(o=>{if((o.isMesh&&!o.isInstancedMesh&&(o.geometry?.attributes.position.count||0)<300000)||o.isSprite)targets.push(o);});const ray=new T.Raycaster();ray.far=30;g.camera.updateMatrixWorld(true);ray.setFromCamera(new T.Vector2(500/innerWidth*2-1,1-400/innerHeight*2),g.camera);const hits=ray.intersectObjects(targets,false).slice(0,6).map(h=>{const m=Array.isArray(h.object.material)?h.object.material[h.face?.materialIndex||0]:h.object.material;let a=h.object,path=[];for(let i=0;a&&i<6;i++,a=a.parent)path.push(a.name||a.type);return{path,material:m?.type,color:m?.color?.getHexString(),transparent:m?.transparent,distance:h.distance,point:h.point.toArray()};});return{hits,camera:g.camera.position.toArray(),viewport:g.renderer.getViewport(new T.Vector4()).toArray(),buffer:g.renderer.getDrawingBufferSize(new T.Vector2()).toArray(),scissor:g.renderer.getScissorTest(),render:g.renderer.info.render,elements:document.elementsFromPoint(500,400).slice(0,5).map(e=>({tag:e.tagName,id:e.id,cls:e.className,bg:getComputedStyle(e).backgroundColor}))};});save();
 // Check the actual bloom buffers, rather than relying only on a screenshot.
 report.checks.bloom=await page.evaluate(()=>{const g=partyTest.game.core,targets=[g.bloom.renderTargetBright,...g.bloom.renderTargetsVertical],stats=[];g.composer.render();for(const target of targets){const pixels=new Uint16Array(target.width*target.height*4);g.renderer.readRenderTargetPixels(target,0,0,target.width,target.height,pixels);let invalid=0;for(let i=0;i<pixels.length;i++)if((pixels[i]&0x7c00)===0x7c00)invalid++;stats.push({name:target.texture.name,invalid,width:target.width,height:target.height});}return{enabled:g.bloom.enabled,strength:g.bloom.strength,radius:g.bloom.radius,threshold:g.bloom.threshold,targets:stats};});save();
 assert(report.checks.bloom.enabled,'The visual review must retain the original bloom');
 assert(report.checks.bloom.targets.every(t=>t.invalid===0),'Non-finite HDR pixels reached the bloom buffers');

 await page.locator('[data-panel=wardrobe]').click();
 report.checks.wardrobeImmediate=await page.evaluate(()=>{const g=partyTest.game.core;const p=document.querySelector('#ui .p-wardrobe');const s=getComputedStyle(p);return{panel:g.ui.panelId,root:document.getElementById('ui').className,className:p.className,display:s.display,visibility:s.visibility,transform:s.transform,rect:p.getBoundingClientRect().toJSON(),rootGlass:getComputedStyle(document.getElementById('ui')).getPropertyValue('--glass-strong'),outfits:p.querySelectorAll('.outfit').length};});save();
 await delay(3000);report.checks.wardrobeSettled=await page.evaluate(()=>{const p=document.querySelector('#ui .panel');const s=getComputedStyle(p);return{panel:partyTest.game.core.ui.panelId,root:document.getElementById('ui').className,className:p.className,display:s.display,visibility:s.visibility,transform:s.transform,rect:p.getBoundingClientRect().toJSON()};});save();await shot('golden-full-wardrobe.png');
 assert(report.checks.wardrobeSettled.rect.x>=0&&report.checks.wardrobeSettled.rect.right<=1360,'Wardrobe is outside the visible viewport');
 report.checks.appearance=await page.evaluate(async()=>{const g=partyTest.game.core,{OUTFITS}=await import('/src/characters/outfits.js'),model=g.trav.girl,original=model.outfit;model.setOutfit(OUTFITS['g-star']);model.setRideWings(true);const guestWings=model.hasWings;model.setRideWings(false);model.setOutfit(original);return{guestWings,signatureVisible:[...document.querySelectorAll('#ui .outfit b')].some(e=>['Starlight Gown','Pink Kurti & Jeans'].includes(e.textContent)),otherGuestWings:[...partyTest.game.players.values()].some(p=>!p.data.isBirthday&&p.model.hasWings),birthdayWings:[...partyTest.game.players.values()].find(p=>p.data.isBirthday)?.model.hasWings};});save();
 assert.equal(report.checks.appearance.guestWings,false);assert.equal(report.checks.appearance.otherGuestWings,false);assert.equal(report.checks.appearance.signatureVisible,false);

 if(uiOnly){await context.close();await browser.close();if(report.errors.length)process.exitCode=1;return;}
 await page.evaluate(()=>partyTest.game.core.ui.closePanel());
 await page.waitForFunction(()=>partyTest.game.core.dress.blend===0);
 const world=await page.evaluate(async()=>{const r=await import('/src/world/regions.js');return r.REGIONS.map(x=>({id:x.id,name:x.name,col:x.col,row:x.row}));});
 report.checks.regions=world;assert.equal(world.length,20);save();
 // Inspect the actual northern venue and the gate approach from the original camera rig.
 await page.evaluate(()=>{const g=partyTest.game.core;g.trav.teleport(0,-7395);g.trav.gPos.y=340.5;g.trav.camYaw=Math.PI;g.trav.camPitch=.1;g.trav.camDist=25;});
 await page.waitForFunction(()=>!!partyTest.game.scenery.venue.palace);await delay(12000);
 await shot('palace-rose-gate-approach.png');
 const normalCamera=await page.evaluate(()=>{window.__normalReviewCamera=partyTest.game.controller.updateCamera;return true;});
 async function inspectCamera(camera,look){await page.evaluate(({camera,look})=>{partyTest.game.controller.updateCamera=cam=>{cam.position.set(...camera);cam.lookAt(...look);};},{camera,look});await delay(3500);}
 await inspectCamera([0,470,-7060],[0,470,-7460]);
 await page.evaluate(()=>partyTest.game.scenery.venue.palace.setGate(false,true));await delay(1500);await shot('palace-rose-gate-closed.png');
 await page.evaluate(()=>partyTest.game.scenery.venue.palace.setGate(true,true));await delay(1500);await shot('palace-rose-gate-open.png');
 await inspectCamera([370,550,-7040],[400,530,-7470]);await shot('palace-window-relief.png');
 report.checks.walkThrough=await page.evaluate(()=>{
   const g=partyTest.game.core,t=g.trav;t.camYaw=Math.PI;t.gPos.set(0,340.5,-7395);t.bPos.set(2,340.5,-7395);
   const controls={dx:0,dy:0,wheel:0,axis:()=>({x:0,y:1}),held:k=>k==='shift',hit:()=>false};
   for(let i=0;i<200;i++)t.update(.05,controls,i*.05);
   return{position:t.gPos.toArray(),floor:partyTest.game.scenery.ground(t.gPos.x,t.gPos.z,t.gPos.y+1)};
 });
 assert(report.checks.walkThrough.position[2]<-7470,'Actual movement could not cross the open gate');save();
 await page.evaluate(()=>{partyTest.game.controller.updateCamera=window.__normalReviewCamera;});

 report.checks.gate=await page.evaluate(()=>{const v=partyTest.game.scenery.venue;return{position:partyTest.game.pos.toArray(),entrance:{bounds:v.palace.vestibule,opening:v.palace.gateOpening?.()},plants:v.gardens?.plantBakeStatus||null};});save();
 await page.evaluate(()=>{const g=partyTest.game.core;g.trav.teleport(-192.5,-8412.5);g.trav.gPos.y=792;g.trav.camYaw=1.1;g.trav.camPitch=.35;g.trav.camDist=16;});
 try{await page.waitForFunction(()=>{const p=partyTest.game.scenery.venue.gardens?.plantBakeStatus;return p?.near&&p.settled;},null,{timeout:90000});}catch(e){report.errors.push({type:'plants',message:String(e)});}
 report.checks.crownPlants=await page.evaluate(()=>partyTest.game.scenery.venue.gardens.plantBakeStatus);save();
 await shot('palace-crown-garden.png');
 await context.close();
 const b=await open('#invite='+encodeURIComponent(fixtures.slots[0].token));await b.page.locator('#join').click();await waitForGame(b.page);
 await b.page.evaluate(()=>partyTest.game.core.wear('girl','g-starlight-gown'));
 await b.page.waitForFunction(()=>partyTest.game.core.trav.girl.hasWings);
 report.checks.birthday=await b.page.evaluate(()=>({privateNarrative:partyTest.game.core.allowPersonalNarrative,companion:partyTest.game.core.st.names.boy,siblings:partyTest.game.core.caravan.bodies.filter(b=>b.def.kind==='sibling').length,wings:partyTest.game.core.trav.girl.hasWings,signatureGown:partyTest.game.core.canWear('girl','g-starlight-gown'),signatureBoy:partyTest.game.core.canWear('boy','b-celebration')}));
 assert.equal(report.checks.birthday.wings,true);assert(report.checks.birthday.signatureGown&&report.checks.birthday.signatureBoy); assert.equal(report.checks.birthday.companion,'AbdulAzim');assert(report.checks.birthday.siblings>0);save();
 await b.context.close();await browser.close();
 if(report.errors.length)process.exitCode=1;
})().catch(async e=>{report.errors.push({type:'fatal',message:String(e),stack:e.stack});save();console.error(e);if(browser){for(const c of browser.contexts())for(const p of c.pages())try{await p.screenshot({path:path.join(out,'failure-view.png'),timeout:15000});}catch{}await browser.close();}process.exitCode=1;});
