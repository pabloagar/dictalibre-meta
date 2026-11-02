import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Window} from 'happy-dom';
const source=fs.readFileSync(new URL('../apps/desktop/report-editor.js',import.meta.url),'utf8').replace("'/report-review.js'",JSON.stringify(new URL('../apps/desktop/report-review.js',import.meta.url).href)).replace("'/shared/report-model.js'",JSON.stringify(new URL('../apps/shared/report-model.js',import.meta.url).href));
const {mountReport}=await import('data:text/javascript;base64,'+Buffer.from(source+'\n//# sourceURL=clinical-editor-test.js').toString('base64'));
function setup(options={}){
 const window=new Window({url:'http://127.0.0.1:8799'});
 for(const key of ['window','document','localStorage','NodeFilter','Option','MutationObserver','CustomEvent'])globalThis[key]=key==='window'?window:window[key];
 globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option;};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:window.navigator});
 globalThis.fetch=async()=>({ok:true,json:async()=>({templates:[]})});
 document.body.innerHTML='<div id="parent"></div>';
 localStorage.setItem('dicta-report-v1','Informe antiguo sintético');
 localStorage.setItem('dicta-report-context-v1',JSON.stringify({name:'Anterior',text:'ANTERIOR'}));
 const editor=mountReport(document.querySelector('#parent'),{globalReview:false,...options});
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
 return {window,editor,button};
}
test('inicio vacío aun con borrador anterior; plantilla explícita, confirmación y deshacer',async()=>{
 const {window,editor,button}=setup();
 assert.equal(editor.model.text,'');assert.equal(editor.context().templateName,'');
 const panel=document.querySelector('.template-library-panel');assert.equal(panel.open,false);
 const select=document.querySelector('[aria-label="Plantilla para el informe"]');select.value='0';
 panel.open=true;button('Aplicar plantilla').click();
 assert.match(editor.model.text,/TÉCNICA/);assert.equal(panel.open,false);
 assert.equal(panel.querySelector('summary').textContent,'Plantilla');assert.equal(panel.hidden,false);
 assert.equal(editor.element.textContent,editor.model.text);assert.equal(editor.element.querySelectorAll('.report-heading').length,3);
 editor.element.textContent='Texto sintético propio';editor.element.dispatchEvent(new window.Event('input'));
 panel.open=true;select.value='';button('Aplicar plantilla').click();
 assert.equal(editor.model.text,'Texto sintético propio');
 button('Reemplazar informe actual').click();assert.equal(editor.model.text,'');
 button('Deshacer').click();assert.equal(editor.model.text,'Texto sintético propio');
 await window.happyDOM.close();
});
test('encabezados conservan offsets de dictado y el texto plano',async()=>{
 const {window,editor}=setup();
 editor.element.textContent='HALLAZGOS\n';editor.element.dispatchEvent(new window.Event('input'));
 editor.begin('synthetic');editor.preview('synthetic','Sin hallazgos de prueba.');
 assert.equal(editor.element.textContent,editor.model.text);assert.equal(editor.element.querySelectorAll('.dictation-provisional').length,1);
 await editor.finish('synthetic','Texto final sintético.','synthetic-run');
 assert.equal(editor.element.textContent,editor.model.text);assert.equal(editor.model.pending,false);
 await window.happyDOM.close();
});

test('selector compacto: cerrar fuera/Escape, ajustar solo al insertar y respetar mínimo de 14 px',async()=>{
 const {window,editor,button}=setup();
 window.requestAnimationFrame=callback=>{callback();return 0;};
 const panel=document.querySelector('.template-library-panel'),select=document.querySelector('[aria-label="Plantilla para el informe"]');
 panel.open=true;document.querySelector('[aria-label="Buscar plantillas"]').click();assert.equal(panel.open,true);
 document.body.click();assert.equal(panel.open,false);
 panel.open=true;panel.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(panel.open,false);
 panel.open=true;button('Cerrar').click();assert.equal(panel.open,false);
 let height=160;
 Object.defineProperties(editor.element,{clientHeight:{get:()=>height},clientWidth:{get:()=>600},scrollHeight:{get:()=>Number.parseInt(editor.element.style.fontSize||'19')*10},scrollWidth:{get:()=>600}});
 select.value='0';panel.open=true;button('Aplicar plantilla').click();await new Promise(r=>setTimeout(r,0));
 assert.equal(panel.open,false);assert.equal(editor.element.style.fontSize,'16px');assert.match(editor.model.text,/CONCLUSIÓN/);
 let fit=JSON.parse(localStorage.getItem('dicta-editor-metrics-v1')).events.filter(e=>e.type==='template-fit').at(-1);assert.equal(fit.fits,true);
 editor.element.textContent='Más texto sintético';editor.element.dispatchEvent(new window.Event('input'));await new Promise(r=>setTimeout(r,0));assert.equal(editor.element.style.fontSize,'16px');
 height=100;panel.open=true;button('Aplicar plantilla').click();button('Reemplazar informe actual').click();await new Promise(r=>setTimeout(r,0));
 assert.equal(editor.element.style.fontSize,'14px');assert.equal(document.querySelector('[aria-label="Reducir tamaño del informe"]').disabled,true);
 fit=JSON.parse(localStorage.getItem('dicta-editor-metrics-v1')).events.filter(e=>e.type==='template-fit').at(-1);assert.equal(fit.fits,false);assert.match(document.querySelector('.report-status').textContent,/Desplázate/);
 await window.happyDOM.close();
});

test('A compacta: rehacer contexto, letra y copia limpia de anotaciones; ediciones invalidan avisos',async()=>{
 const {window,editor,button}=setup({globalReview:true});
 let copied=null;Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{copied=text;}},configurable:true});
 const input=text=>{editor.element.textContent=text;editor.element.dispatchEvent(new window.Event('input'));};
 input('Hallazgo derecho. Resumen izquierdo.');button('Deshacer').click();assert.equal(editor.model.text,'');button('Rehacer').click();assert.equal(editor.model.text,'Hallazgo derecho. Resumen izquierdo.');
 document.querySelector('[aria-label="Aumentar tamaño del informe"]').click();assert.equal(editor.element.style.fontSize,'20px');
 globalThis.fetch=async()=>({ok:true,json:async()=>({id:'synthetic-review',status:'completed',suggestions:[{original:'izquierdo',reason:'Comprobar lateralidad.',evidence:['derecho','izquierdo']}]})});
 button('Revisar con IA').click();await button('Enviar a Meta y revisar').onclick();
 assert.equal(editor.element.querySelector('.report-annotation').textContent,'izquierdo');assert.equal(editor.element.textContent,editor.model.text);
 button('Nuevo informe').click();button('Vaciar y empezar').click();assert.equal(editor.model.text,'');assert.equal(editor.reviewPanel.hidden,true);button('Deshacer').click();assert.equal(editor.element.querySelector('.report-annotation').textContent,'izquierdo');assert.equal(editor.reviewPanel.hidden,false);
 await button('Copiar para RIS').onclick();assert.equal(copied,'Hallazgo derecho. Resumen izquierdo.');
 button('Es correcto').click();assert.equal(editor.element.querySelector('.report-annotation'),null);assert.equal(editor.model.text,copied);
 await button('Enviar a Meta y revisar').onclick();assert.ok(editor.element.querySelector('.report-annotation'));
 input('Edición nueva');assert.equal(editor.element.querySelector('.report-annotation'),null);assert.equal(document.querySelector('.report-global-review').dataset.stale,'true');
 await window.happyDOM.close();
});
for(const savedTheme of [null,'sala'])test('montaje completo, controles y tema guardado '+savedTheme,async()=>{
 const {window}=setup();document.body.innerHTML=fs.readFileSync(new URL('../apps/desktop/index.html',import.meta.url),'utf8').split('<body>')[1].split('</body>')[0];
 globalThis.requestAnimationFrame=()=>0;
 const state={configs:[{id:'synthetic',engine:'muse',keywords:[],name:'Prueba'}],metaConfigured:false};
 globalThis.__clinicalTest={mountReport,state};if(savedTheme)localStorage.setItem('dicta-theme-v1',savedTheme);
 let live=fs.readFileSync(new URL('../apps/desktop/live.js',import.meta.url),'utf8');
 live=live.replace(/^import .*;\r?\n/gm,'');
 live="const {state}=globalThis.__clinicalTest;const mountReport=(p,o)=>globalThis.__clinicalTest.mountReport(p,{...o,globalReview:false});const sharedState=async()=>state;\n"+live;
 await import('data:text/javascript;base64,'+Buffer.from(live+'\n//# sourceURL=clinical-live-test-'+savedTheme+'.js').toString('base64'));
 assert.equal(document.body.dataset.theme,savedTheme==='sala'?'ambar':'dia');if(savedTheme==='sala')assert.equal(localStorage.getItem('dicta-theme-v1'),'ambar');
 assert.equal(document.querySelector('.clinical-editbar .template-library-panel').open,false);
 assert.equal(document.querySelector('.clinical-sheet .report-editor').textContent,'');
 assert.equal(document.querySelectorAll('#create').length,1);
 assert.ok(document.querySelector('.clinical-settings #metrics-export'));
 assert.ok(document.querySelector('.clinical-status'));
 assert.equal(document.querySelectorAll('.clinical-record').length,1);
 assert.equal(document.querySelectorAll('.sex-control').length,1);assert.ok(document.querySelector('.sheet-head .sex-control'));assert.equal(document.querySelector('header .sex-control'),null);
 assert.equal(document.querySelector('.clinical-settings').open,false);
 assert.ok(document.querySelector('.clinical-editbar .report-redo'));
 assert.equal(document.querySelector('.template-library-panel').nextElementSibling,document.querySelector('.clinical-settings'));
 assert.equal(document.querySelector('.template-library-panel summary').textContent,'Plantilla');
 assert.ok(document.querySelector('.clinical-notes .report-global-review'));
 const connection=document.querySelector('.connection-panel'),pairing=document.querySelector('.pairing');
 connection.querySelector('summary').getBoundingClientRect=()=>({left:240,bottom:60});
 connection.open=true;connection.dispatchEvent(new window.Event('toggle'));
 assert.equal(pairing.style.left,'240px');assert.equal(pairing.style.top,'68px');
 pairing.click();assert.equal(connection.open,true);document.body.click();assert.equal(connection.open,false);
 const templates=document.querySelector('.template-library-panel');templates.open=true;templates.dispatchEvent(new window.Event('toggle'));
 assert.equal(document.querySelector('.template-picker').style.width,'780px');
 const settings=document.querySelector('.clinical-settings');settings.open=true;settings.dispatchEvent(new window.Event('toggle'));await new Promise(r=>setTimeout(r,0));assert.equal(templates.open,false);
 document.querySelector('[data-page="apariencia"]').click();assert.equal(document.querySelector('.appearance-panel').hidden,false);document.querySelector('[data-value="penumbra"]').click();assert.equal(document.body.dataset.theme,'penumbra');assert.equal(localStorage.getItem('dicta-theme-v1'),'penumbra');
 document.querySelector('[data-page="ayuda"]').click();assert.equal(document.querySelectorAll('.help-step').length,4);document.querySelector('.settings-close').click();assert.equal(settings.open,false);
 const level=document.querySelector('#level');level.value=.8;await new Promise(r=>setTimeout(r,0));assert.ok(document.querySelectorAll('.audio-bars .lit').length>0);
 level.value=0;await new Promise(r=>setTimeout(r,0));assert.equal(document.querySelectorAll('.audio-bars .lit').length,0);
 await window.happyDOM.close();delete globalThis.__clinicalTest;
});

test('tema: Día por defecto, valores válidos y migración Sala a Ámbar',()=>{
 const live=fs.readFileSync(new URL('../apps/desktop/live.js',import.meta.url),'utf8');
 const declaration=live.match(/function resolveTheme\(saved\)\{[^\n]+\}/)[0];
 const resolve=new Function(declaration+';return resolveTheme;')();
 for(const input of [null,undefined,'','invalid'])assert.equal(resolve(input),'dia');
 assert.equal(resolve('sala'),'ambar');for(const theme of ['dia','penumbra','ambar'])assert.equal(resolve(theme),theme);
});

test('paleta: favorita por fila y guardar el informe actual como plantilla',async()=>{
 const {window,editor,button}=setup();editor.element.textContent='Texto sintético de plantilla propia';editor.element.dispatchEvent(new window.Event('input'));
 button('Guardar el informe actual como plantilla').click();assert.equal(document.querySelector('[aria-label="Contenido de plantilla"]').value,editor.model.text);
 document.querySelector('[aria-label="Nombre de plantilla"]').value='Mi estructura';button('Guardar nueva plantilla').click();
 assert.equal(JSON.parse(localStorage.getItem('dicta-templates-v1')).at(-1).text,editor.model.text);
 const palette=document.querySelector('.template-library-panel');palette.open=true;document.querySelector('.template-choice').click();assert.equal(palette.open,true);
 const star=[...document.querySelectorAll('.template-star')].find(b=>b.getAttribute('aria-label')==='Favorita: Mi estructura');star.click();assert.equal(palette.open,true);assert.equal(JSON.parse(localStorage.getItem('dicta-template-favorites-v1')).length,1);
 assert.equal(editor.model.text,'Texto sintético de plantilla propia');await window.happyDOM.close();
});

test('Nuevo informe confirma, conserva preferencias y permite recuperar texto, sexo y contexto',async()=>{
 const {window,editor,button}=setup();const paired=document.createElement('div');paired.id='paired';paired.hidden=false;document.body.append(paired);
 assert.equal(button('Nuevo informe').disabled,true);editor.setSex('F');assert.equal(button('Nuevo informe').disabled,false);button('Nuevo informe').click();assert.equal(editor.getSex(),'—');button('Deshacer').click();assert.equal(editor.getSex(),'F');
 editor.element.textContent='Texto sintético antes de limpiar';editor.element.dispatchEvent(new window.Event('input'));editor.model.templateContext={name:'Contexto sintético'};
 button('A+').click();const size=editor.element.style.fontSize;localStorage.setItem('dicta-theme-v1','ambar');
 button('Nuevo informe').click();assert.equal(document.querySelector('.new-report-confirm').hidden,false);button('Cancelar').click();assert.equal(editor.model.text,'Texto sintético antes de limpiar');
 button('Nuevo informe').click();button('Vaciar y empezar').click();assert.equal(editor.model.text,'');assert.equal(editor.getSex(),'—');assert.equal(editor.model.templateContext,null);assert.equal(paired.hidden,false);assert.equal(editor.element.style.fontSize,size);assert.equal(localStorage.getItem('dicta-theme-v1'),'ambar');
 button('Deshacer').click();assert.equal(editor.model.text,'Texto sintético antes de limpiar');assert.equal(editor.getSex(),'F');assert.equal(editor.model.templateContext.name,'Contexto sintético');button('Rehacer').click();assert.equal(editor.model.text,'');assert.equal(editor.getSex(),'—');
 editor.setSex('M');editor.begin('synthetic-take');assert.equal(button('Nuevo informe').disabled,true);editor.cancel('synthetic-take');assert.equal(button('Nuevo informe').disabled,false);
 await window.happyDOM.close();
});
