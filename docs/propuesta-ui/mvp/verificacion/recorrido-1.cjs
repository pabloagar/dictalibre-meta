const {chromium}=require('playwright');const S=process.argv[2];
(async()=>{const b=await chromium.launch();const out={};
for(const [w,h] of [[1366,768],[1440,900],[1920,1080]]){
 const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('http://127.0.0.1:8789/live');await p.waitForTimeout(1200);
 const r={};
 r.pickerOpen=await p.evaluate(()=>document.querySelector('.template-library-panel').open);
 r.bodyClass=await p.evaluate(()=>document.body.className);
 r.quick=await p.locator('.quick-item').count();
 r.quickEnabled=await p.locator('.quick-item:not(:disabled)').count();
 if(w===1440)await p.screenshot({path:S+'/01-picker-vacio.png'});
 // cerrar selector sin plantilla no se puede; usar "Informe en blanco" vía primer quick o crear informe
 const first=p.locator('.quick-item:not(:disabled)').first();
 if(await first.count()){await first.click();}else{await p.locator('select[aria-label="Plantilla para el informe"]').selectOption('');await p.locator('.template-library-panel button',{hasText:'Crear informe'}).click();}
 await p.waitForTimeout(400);
 r.afterPickerOpen=await p.evaluate(()=>document.querySelector('.template-library-panel').open);
 r.afterBody=await p.evaluate(()=>document.body.className);
 r.summary=await p.locator('.template-library-panel>summary').innerText();
 if(w===1440)await p.screenshot({path:S+'/02-informe.png'});
 // sexo
 await p.locator('.sex-seg button[data-v="F"]').click();
 r.sexPressed=await p.locator('.sex-seg button[aria-pressed="true"]').innerText();
 const ed=p.locator('[contenteditable]').first();await ed.evaluate(e=>e.focus());await p.keyboard.type(' Próstata de tamaño normal.');await p.waitForTimeout(300);
 r.sexWarn=await p.locator('.sex-warnings').innerText();
 if(w===1440)await p.screenshot({path:S+'/03-aviso-sexo.png'});
 // ajustes
 await p.locator('.settings-menu>summary').click();await p.waitForTimeout(200);
 if(w===1440)await p.screenshot({path:S+'/04-ajustes.png'});
 // tema día
 await p.locator('.settings-body select[aria-label="Tema de la interfaz"]').selectOption('dia');await p.waitForTimeout(200);
 r.tema=await p.evaluate(()=>document.documentElement.dataset.theme);
 if(w===1440)await p.screenshot({path:S+'/05-dia-ajustes.png'});
 await p.locator('.settings-menu>summary').click();
 if(w===1440)await p.screenshot({path:S+'/06-dia.png'});
 await p.locator('.settings-body select[aria-label="Tema de la interfaz"]').selectOption('sala').catch(()=>{});
 // sobreflujo horizontal
 r.overflowX=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 r.barOverflow=await p.evaluate(()=>{const b=document.querySelector('.study-bar');return b.scrollWidth-b.clientWidth});
 r.errs=errs;out[w]=r;await c.close();}
console.log(JSON.stringify(out,null,1));await b.close();})();
