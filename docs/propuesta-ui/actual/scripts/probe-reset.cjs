const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({args:['--no-proxy-server']});const c=await b.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();
 await p.goto('http://127.0.0.1:8789/live');await p.waitForTimeout(1200);
 await p.click('.report-editor');await p.keyboard.type('Texto sintético de prueba.');await p.waitForTimeout(300);
 const t=()=>p.$eval('.report-editor',e=>e.innerText);
 console.log('antes:',JSON.stringify(await t()));
 await p.click('#create');await p.waitForTimeout(1200);
 console.log('tras Conectar:',JSON.stringify(await t()),'| status:',await p.$eval('.report-status',e=>e.innerText));
await p.locator('button',{hasText:'Deshacer'}).evaluate(b=>b.click());await p.waitForTimeout(300);
 console.log('tras Deshacer:',JSON.stringify(await t()),'| status:',await p.$eval('.report-status',e=>e.innerText));

 await p.reload();await p.waitForTimeout(1200);console.log('tras recargar:',JSON.stringify(await t()));
 await b.close();
})();
