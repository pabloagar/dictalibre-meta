const {chromium}=require('playwright');const S=process.argv[2];
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://127.0.0.1:8789/live');await p.waitForTimeout(1500);
const r={};r.enabled=await p.locator('.quick-item:not(:disabled)').allInnerTexts();
await p.screenshot({path:S+'/01b-picker-con-plantillas.png'});
await p.locator('.quick-item:not(:disabled)').first().click();await p.waitForTimeout(500);
r.open=await p.evaluate(()=>document.querySelector('.template-library-panel').open);r.body=await p.evaluate(()=>document.body.className);
r.summary=await p.locator('.template-library-panel>summary').innerText();
r.texto=await p.locator('[contenteditable]').first().innerText();
r.glosario=await p.locator('.nota-glosario').innerText();
await p.screenshot({path:S+'/02b-informe-plantilla.png'});
// reabrir selector desde la barra
await p.locator('.template-library-panel>summary').click();await p.waitForTimeout(300);await p.screenshot({path:S+'/02c-selector-desde-barra.png'});
await p.locator('.template-library-panel>summary').click();
// tras recarga la plantilla persiste: no debe aparecer picker
await p.reload();await p.waitForTimeout(1200);r.reloadBody=await p.evaluate(()=>document.body.className);r.reloadOpen=await p.evaluate(()=>document.querySelector('.template-library-panel').open);
// A1
const ed=p.locator('[contenteditable]').first();await ed.evaluate(e=>e.focus());await p.keyboard.type(' Texto A1.');await p.waitForTimeout(150);
await p.evaluate(()=>window.dispatchEvent(new Event('dicta-new-session')));await p.waitForTimeout(200);r.a1=(await ed.innerText()).includes('Texto A1.');
// diagnóstico
await p.locator('.settings-menu>summary').click();await p.locator('.settings-body button',{hasText:'Mediciones y diagnóstico'}).click();await p.waitForTimeout(200);
r.diagOpen=await p.evaluate(()=>document.querySelector('.diagnostics').open);await p.screenshot({path:S+'/07-diagnostico.png'});
r.errs=errs;console.log(JSON.stringify(r,null,1));await b.close();})();
