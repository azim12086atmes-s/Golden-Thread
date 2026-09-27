const fs = require('node:fs');
const { chromium } = require('playwright');
const lands = ['japan','korea','china','norway','switzerland','london','newyork','renaissance','vintage','islamic','middleeast','desert','egypt','indianorth','indiasouth','mughal','indonesia','aurora','skyisles'];
(async () => {
  fs.mkdirSync('art/monument-renders',{recursive:true});
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
  let count=0;
  for (const land of lands) {
    console.log('Rendering '+land, new Date().toISOString());
    const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:1});
    page.on('pageerror',e=>console.error(land+' page error: '+e.message));
    try {
      await page.goto('http://127.0.0.1:5191/monument-preview.html?land='+land,{waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForFunction(()=>window.__renderReady,null,{timeout:90000});
      console.log('Ready '+land+': '+JSON.stringify(await page.evaluate(()=>window.__renderReady)));
      await page.screenshot({path:'art/monument-renders/'+land+'.png',timeout:90000});
      count++;
      console.log('Saved '+land+'.png');
    } catch(e) { console.error('Failed '+land+': '+e.stack); }
    await page.close();
  }
  await browser.close();
  console.log('Saved '+count+' of '+lands.length+' monument renders');
  if (!count) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
