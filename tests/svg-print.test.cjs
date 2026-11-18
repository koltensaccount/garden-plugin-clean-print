const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const chrome=process.env.CHROME_PATH||'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
test('SVG print palette follows export paper and preview, preserving screen mode',async()=>{
 const browser=await chromium.launch({executablePath:chrome});
 try{
  const page=await browser.newPage({colorScheme:'light'});
  await page.setContent(`<style>body{background:#232322;color:white}main img{color-scheme:dark}</style><body class="theme-dark"><main class="content"><h1>SVG export</h1><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='50'%3E%3C/svg%3E"></main></body>`);
  await page.addStyleTag({path:path.join(root,'styles/clean-print.css')});
  await page.evaluate(()=>{window.print=()=>{window.printReady=true}});
  await page.addScriptTag({path:path.join(root,'assets/nav-tools.js')});
  await page.addScriptTag({path:path.join(root,'assets/clean-print.js')});
  for(const [background,scheme] of [[true,'dark'],[false,'light']]){
   await page.locator('#dg-clean-print-control').click();
   if(!await page.locator('.dg-print-advanced').evaluate(e=>e.open))await page.locator('.dg-print-advanced summary').click();
   await page.locator('[name=themeBackground]').setChecked(background);
   await page.waitForFunction(s=>{const frame=document.querySelector('.dg-print-preview iframe');const img=frame.contentDocument?.querySelector('main img');return img&&frame.contentWindow.getComputedStyle(img).colorScheme===s},scheme);
   await page.evaluate(()=>{window.printReady=false});
   await page.locator('.dg-print-submit').click();await page.waitForFunction(()=>window.printReady);
   await page.emulateMedia({media:'print'});
   assert.equal(await page.locator('main img').evaluate(e=>getComputedStyle(e).colorScheme),scheme);
   await page.emulateMedia({media:'screen'});
   assert.equal(await page.locator('main img').evaluate(e=>getComputedStyle(e).colorScheme),'dark');
  }
 }finally{await browser.close()}
});
