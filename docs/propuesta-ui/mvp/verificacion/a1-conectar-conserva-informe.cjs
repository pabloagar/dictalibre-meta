// A1: una sesión nueva del teléfono (dicta-new-session) no debe vaciar el informe.
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://127.0.0.1:8789/live');await p.waitForTimeout(1000);
const ed=p.locator('[contenteditable]').first();await ed.evaluate(e=>e.focus());await p.keyboard.type('Texto sintético del informe.');await p.waitForTimeout(150);
const antes=await ed.innerText();await p.evaluate(()=>window.dispatchEvent(new Event('dicta-new-session')));await p.waitForTimeout(200);const despues=await ed.innerText();
console.log(JSON.stringify({antes,despues,conservado:despues.includes('Texto sintético del informe.'),errs}));process.exitCode=despues.includes('Texto sintético del informe.')?0:1;await b.close();})();
