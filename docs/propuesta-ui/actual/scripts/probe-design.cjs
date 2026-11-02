const { chromium } = require('playwright');const fs=require('fs');
require('http').createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(fs.readFileSync(require('path').join(__dirname,'../../../../design/dictation-workspace.html')));}).listen(8793,'127.0.0.1').unref();
(async()=>{const b=await chromium.launch({args:['--no-proxy-server']});const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
 await p.goto('http://127.0.0.1:8793/');await p.waitForTimeout(500);
 await p.click('text=Ver cómo aparece el dictado');await p.waitForTimeout(2600);
 await p.screenshot({path:'desktop-1440-design-02-simulacion.png',fullPage:true});
 await p.waitForTimeout(6000);await p.screenshot({path:'desktop-1440-design-02b-simulacion-final.png',fullPage:true});
 console.log(await p.$$eval('button',b=>b.map(e=>e.innerText.trim()+(e.disabled?'(disabled)':'')).join(' | ')));
 await b.close();})();
