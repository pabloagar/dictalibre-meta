import {createTakeQueue} from '../apps/desktop/stream-client.js';
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
 localStorage.setItem('dicta-report-v1',options.savedDraft??'');
 localStorage.setItem('dicta-report-context-v1',JSON.stringify(options.savedDraft?{name:'Anterior',text:'ANTERIOR'}:null));
 const editor=mountReport(document.querySelector('#parent'),{globalReview:false,...options});
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
 return {window,editor,button};
}
test('inicio vacío sin borrador; plantilla explícita, confirmación y deshacer',async()=>{
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
 await button('Revisar con IA').onclick();
 assert.equal(editor.element.querySelector('.report-annotation').textContent,'izquierdo');assert.equal(editor.element.textContent,editor.model.text);
 button('Nuevo informe').click();button('Vaciar y empezar').click();assert.equal(editor.model.text,'');assert.equal(editor.reviewPanel.hidden,true);button('Deshacer').click();assert.equal(editor.element.querySelector('.report-annotation').textContent,'izquierdo');assert.equal(editor.reviewPanel.hidden,false);
 await button('Copiar para RIS').onclick();assert.equal(copied,'Hallazgo derecho. Resumen izquierdo.');
 button('Es correcto').click();assert.equal(editor.element.querySelector('.report-annotation'),null);assert.equal(editor.model.text,copied);
 await button('Revisar de nuevo').onclick();assert.ok(editor.element.querySelector('.report-annotation'));
 input('Edición nueva');assert.equal(editor.element.querySelector('.report-annotation'),null);assert.equal(document.querySelector('.report-global-review').dataset.stale,'true');
 await window.happyDOM.close();
});
for(const savedTheme of [null,'sala'])test('montaje completo, controles y tema guardado '+savedTheme,async()=>{
 const {window}=setup();document.body.innerHTML=fs.readFileSync(new URL('../apps/desktop/index.html',import.meta.url),'utf8').split('<body>')[1].split('</body>')[0];
 globalThis.requestAnimationFrame=()=>0;
 const state={configs:[{id:'synthetic',engine:'muse',keywords:[],name:'Prueba'}],metaConfigured:false};
 globalThis.__clinicalTest={mountReport,state,createTakeQueue};if(savedTheme)localStorage.setItem('dicta-theme-v1',savedTheme);
 let live=fs.readFileSync(new URL('../apps/desktop/live.js',import.meta.url),'utf8');
 live=live.replace(/^import .*;\r?\n/gm,'');
 live="const {state,createTakeQueue}=globalThis.__clinicalTest;const mountReport=(p,o)=>globalThis.__clinicalTest.mountReport(p,{...o,globalReview:false});const sharedState=async()=>state;\n"+live;
 await import('data:text/javascript;base64,'+Buffer.from(live+'\n//# sourceURL=clinical-live-test-'+savedTheme+'.js').toString('base64'));
 assert.equal(document.body.dataset.theme,savedTheme==='sala'?'ambar':'dia');if(savedTheme==='sala')assert.equal(localStorage.getItem('dicta-theme-v1'),'ambar');
 assert.equal(document.querySelector('.clinical-editbar .template-library-panel').open,false);
 assert.equal(document.querySelector('.clinical-sheet .report-editor').textContent,'');
 assert.equal(document.querySelectorAll('#create').length,1);
 assert.ok(document.querySelector('.clinical-settings #metrics-export'));
 assert.ok(document.querySelector('.clinical-status'));
 assert.equal(document.querySelectorAll('.clinical-record').length,1);
 assert.equal(document.querySelectorAll('.sex-control').length,1);assert.ok(document.querySelector('.clinical-sheet > .clinical-editbar .sex-control'));assert.equal(document.querySelector('header .sex-control'),null);
 assert.equal(document.querySelector('.clinical-settings').open,false);
 assert.ok(document.querySelector('.clinical-editbar .report-redo'));
 assert.equal(document.querySelector('.template-library-panel').nextElementSibling,document.querySelector('.clinical-settings'));
 assert.equal(document.querySelector('.template-library-panel summary').textContent,'Plantilla');
 assert.ok(document.querySelector('.clinical-notes .report-global-review'));
 const connection=document.querySelector('.connection-panel'),pairing=document.querySelector('.pairing');
 const paired=document.querySelector('#paired');paired.hidden=false;paired.dataset.paused='true';await new Promise(r=>setTimeout(r,0));assert.equal(connection.querySelector('summary').textContent,'Teléfono en pausa');paired.dataset.paused='false';await new Promise(r=>setTimeout(r,0));assert.equal(connection.querySelector('summary').textContent,'Teléfono conectado');paired.hidden=true;
 let sessionRequests=0;const create=document.querySelector('#create');create.onclick=()=>{sessionRequests++;create.disabled=true;};
 connection.querySelector('summary').getBoundingClientRect=()=>({left:240,bottom:60});
 connection.open=true;connection.dispatchEvent(new window.Event('toggle'));
 assert.equal(sessionRequests,1);connection.dispatchEvent(new window.Event('toggle'));assert.equal(sessionRequests,1);
 create.disabled=false;document.querySelector('#pairing').hidden=false;connection.dispatchEvent(new window.Event('toggle'));assert.equal(sessionRequests,1);
 assert.equal(pairing.style.left,'240px');assert.equal(pairing.style.top,'68px');
 pairing.click();assert.equal(connection.open,true);document.body.click();assert.equal(connection.open,false);
 const templates=document.querySelector('.template-library-panel'),shortcut=document.querySelector('.inline-template-link');shortcut.click();assert.equal(templates.open,true);templates.dispatchEvent(new window.Event('toggle'));
 assert.equal(shortcut.getAttribute('aria-expanded'),'true');assert.equal(document.querySelector('.report-editor').textContent,'');
 assert.equal(shortcut.getAttribute('aria-controls'),document.querySelector('.template-picker').id);
 assert.equal(document.querySelector('.template-picker').style.width,'780px');
 assert.equal(document.querySelector('.template-picker').style.left,Math.max(8,window.innerWidth-780-16)+'px');
 const settings=document.querySelector('.clinical-settings');settings.open=true;settings.dispatchEvent(new window.Event('toggle'));await new Promise(r=>setTimeout(r,0));assert.equal(templates.open,false);
 const engine=document.querySelector('select[aria-label="Motor para dictar"]'),segments=document.querySelector('select[aria-label="Segmentación de Muse-streaming"]'),glossary=document.querySelector('select[aria-label="Glosario de Muse"]');
 assert.equal(segments.parentElement.hidden,true);assert.equal(glossary.parentElement.hidden,true);
 document.querySelector('[role="group"][aria-label="Motor para dictar"]').querySelector('button:last-child').click();
 assert.equal(engine.value,'muse-stream');assert.equal(segments.parentElement.hidden,false);assert.equal(glossary.parentElement.hidden,false);
 assert.ok(engine.parentElement.contains(document.getElementById(engine.getAttribute('aria-describedby'))));
 assert.ok(segments.parentElement.contains(document.getElementById(segments.getAttribute('aria-describedby'))));
 const commands=document.querySelector('[role="switch"][aria-label="Aplicar comandos de dictado"]');commands.click();assert.equal(commands.checked,false);commands.click();assert.equal(commands.checked,true);
 const review=document.querySelector('[role="switch"][aria-label="Revisar cada toma con IA"]');review.click();assert.equal(review.checked,false);
 const advanced=document.querySelector('.advanced-settings');assert.equal(advanced.open,false);assert.ok(advanced.contains(document.querySelector('#recordings')));assert.ok(advanced.contains(document.querySelector('#metrics-export')));
 // Happy DOM omits the implicit tabIndex=0 that Chrome gives native summaries.
 for(const summary of settings.querySelectorAll('summary'))summary.tabIndex=0;
 const firstSetting=document.querySelector('[data-page="dictado"]');firstSetting.focus();firstSetting.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true}));assert.equal(document.activeElement.parentElement.className,'advanced-settings');
 document.querySelector('[data-page="apariencia"]').click();assert.equal(document.querySelector('.appearance-panel').hidden,false);document.querySelector('[data-value="penumbra"]').click();assert.equal(document.body.dataset.theme,'penumbra');assert.equal(localStorage.getItem('dicta-theme-v1'),'penumbra');
 document.querySelector('[data-page="ayuda"]').click();assert.equal(document.querySelectorAll('.howto-panel .help-step').length,4);document.querySelector('.settings-close').click();assert.equal(settings.open,false);
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

test('tomas consecutivas se insertan tras su predecesora sin sustituir texto',async()=>{
 const {window,editor}=setup();editor.begin('first');editor.preview('first','Primera provisional');
 await editor.finish('first','Primera definitiva.','run-1');editor.begin('second','first');editor.preview('second','Segunda provisional');await editor.finish('second','Segunda definitiva.','run-2');
 assert.equal(editor.model.text,'Primera definitiva. Segunda definitiva.');await window.happyDOM.close();
});

test('recupera borrador y contexto sin inventar historial de deshacer',async()=>{const {window,editor,button}=setup({savedDraft:'Texto sintético recuperable'});assert.equal(editor.model.text,'Texto sintético recuperable');assert.equal(editor.context().templateName,'Anterior');assert.equal(button('Deshacer').disabled,true);await window.happyDOM.close();});

test('recarga conserva texto confirmado y sexo; no recupera el provisional como definitivo',async()=>{
 const {window,editor}=setup();editor.element.textContent='Confirmado sintético.';editor.element.dispatchEvent(new window.Event('input'));editor.setSex('F');editor.begin('pending');editor.preview('pending','Provisional sintético');
 const next=mountReport(document.querySelector('#parent'),{globalReview:false});assert.equal(next.model.text,'Confirmado sintético.');assert.equal(next.getSex(),'F');assert.equal(next.model.pending,false);assert.equal(next.model.history.length,0);
 assert.ok(document.body.textContent.includes('Borrador recuperado'));
 const metrics=JSON.parse(localStorage.getItem('dicta-editor-metrics-v1'));const restore=metrics.events.find(e=>e.type==='draft-restored');assert.equal(restore.restored,true);assert.ok(restore.elapsedMs>=0);assert.equal(restore.failed,false);
 await window.happyDOM.close();
});

test('aceptar propuesta global conserva el resto y permite deshacer',async()=>{
 const {window,editor,button}=setup({globalReview:true});
 const original='Engrosamiento de 24 mili. Milímetros de espesor.';
 editor.element.textContent=original;editor.element.dispatchEvent(new window.Event('input'));
 globalThis.fetch=async()=>({ok:true,json:async()=>({id:'synthetic-proposal',status:'completed',suggestions:[{original:'mili. Milímetros',replacement:'milímetros',reason:'Unidad truncada y repetida.',kind:'format',category:'grammar',evidence:['mili. Milímetros']}]})});
 await button('Revisar con IA').onclick();
 assert.equal(editor.model.text,original);
 button('Aceptar').click();
 assert.equal(editor.model.text,'Engrosamiento de 24 milímetros de espesor.');
 button('Deshacer').click();
 assert.equal(editor.model.text,original);
 await window.happyDOM.close();
});

test('demo oculta detalles técnicos de sesión y mantiene controles de dictado',async()=>{
 const {window}=setup();
 document.body.innerHTML=fs.readFileSync(new URL('../apps/desktop/index.html',import.meta.url),'utf8').split('<body>')[1].split('</body>')[0];
 globalThis.requestAnimationFrame=()=>0;
 const state={demo:true,configs:[{id:'demo-muse',engine:'muse-stream',keywords:[],name:'Prueba'}],metaConfigured:false};
 globalThis.__clinicalDemoTest={mountReport,state,createTakeQueue};
 let live=fs.readFileSync(new URL('../apps/desktop/live.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 live="const {state,createTakeQueue}=globalThis.__clinicalDemoTest;const mountReport=(p,o)=>globalThis.__clinicalDemoTest.mountReport(p,{...o,globalReview:false});const sharedState=async()=>state;\n"+live;
 await import('data:text/javascript;base64,'+Buffer.from(live+'\n//# sourceURL=clinical-demo-hidden-details.js').toString('base64'));
 assert.equal(document.querySelector('.advanced-settings').hidden,true);
 assert.ok(document.querySelector('#metrics-export').closest('[hidden]'));
 assert.ok(document.querySelector('#recordings').closest('[hidden]'));
 assert.equal(document.querySelector('.text-settings').hidden,false);
 await window.happyDOM.close();delete globalThis.__clinicalDemoTest;
});

test('interpretación protegida exige confirmar y conserva deshacer; edición invalida confirmación',async()=>{
 const {window,editor,button}=setup({globalReview:true});
 const original='Lesión de siete milimetrijilos.';
 const input=t=>{editor.element.textContent=t;editor.element.dispatchEvent(new window.Event('input'));};
 input(original);
 globalThis.fetch=async()=>({ok:true,json:async()=>({id:'guarded-test',status:'completed',suggestions:[{original:'milimetrijilos',replacement:null,proposedReplacement:'milímetros',guarded:true,kind:'ambiguous_term',reason:'Comprobar unidad.',evidence:['milimetrijilos']}]})});
 await button('Revisar con IA').onclick();
 assert.match(editor.reviewPanel.textContent,/Posible interpretación/);
 assert.equal(editor.model.text,original);
 button('Confirmo el dato y aplico el cambio').onclick();assert.equal(editor.model.text,original);
 button('Revisar y confirmar').click();assert.equal(editor.model.text,original);
 button('Conservar original').click();assert.equal(editor.model.text,original);
 button('Revisar y confirmar').click();button('Confirmo el dato y aplico el cambio').click();
 assert.equal(editor.model.text,'Lesión de siete milímetros.');
 button('Deshacer').click();assert.equal(editor.model.text,original);
 await button('Revisar de nuevo').onclick();
 button('Revisar y confirmar').click();input('Texto modificado.');
 button('Confirmo el dato y aplico el cambio').onclick();assert.equal(editor.model.text,'Texto modificado.');
 await window.happyDOM.close();
});


test('rediseño: aviso anclado, teclado, copia limpia y acciones compartidas',async()=>{
 const {window,editor,button}=setup({globalReview:true});
 editor.element.textContent='Hallazgo secuenzia derecho.';editor.element.dispatchEvent(new window.Event('input'));
 let copied=null;Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{copied=text;}},configurable:true});
 globalThis.fetch=async()=>({ok:true,json:async()=>({id:'redesign-fixture',status:'completed',suggestions:[{kind:'ambiguous_term',original:'secuenzia',replacement:'secuencia',reason:'Ejemplo sintético.',evidence:[]}]})});
 await button('Revisar con IA').onclick();
 let mark=editor.element.querySelector('.report-annotation');mark.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 let popup=document.querySelector('.review-popover');assert.ok(popup);assert.equal(editor.element.contains(popup),false);assert.equal(document.activeElement,popup.querySelector('button'));
 await button('Copiar para RIS').onclick();assert.equal(copied,'Hallazgo secuenzia derecho.');
 popup.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(document.querySelector('.review-popover'),null);assert.equal(document.activeElement,mark);
 button('Ir al texto').click();popup=document.querySelector('.review-popover');assert.ok(popup);popup.querySelector('.accept-correction').click();
 assert.equal(editor.model.text,'Hallazgo secuencia derecho.');assert.equal(document.querySelector('.review-popover'),null);assert.equal(editor.reviewPanel.dataset.stale,'true');
 button('Deshacer').click();assert.equal(editor.model.text,'Hallazgo secuenzia derecho.');
 mark=editor.element.querySelector('.report-annotation');mark.click();document.body.click();assert.equal(document.querySelector('.review-popover'),null);
 mark.click();editor.element.textContent='Edición sintética';editor.element.dispatchEvent(new window.Event('input'));assert.equal(document.querySelector('.review-popover'),null);
 await window.happyDOM.close();
});

test('rediseño: confirmación protegida en letrero y conteo al reconocer aviso',async()=>{
 const {window,editor,button}=setup({globalReview:true});
 editor.element.textContent='Doce milímetros.';editor.element.dispatchEvent(new window.Event('input'));
 globalThis.fetch=async()=>({ok:true,json:async()=>({id:'protected-fixture',status:'completed',suggestions:[{kind:'ambiguous_term',original:'Doce milímetros',replacement:null,guarded:true,proposedReplacement:'12 mm',reason:'Interpretación sintética.',evidence:[]}]})});
 await button('Revisar con IA').onclick();editor.element.querySelector('.report-annotation').click();
 assert.equal(editor.model.text,'Doce milímetros.');assert.equal(document.querySelector('.review-popover .accept-correction').textContent,'Confirmo el dato y aplico el cambio');
 document.querySelector('.review-popover .accept-correction').click();assert.equal(editor.model.text,'12 mm.');
 button('Deshacer').click();button('Es correcto').click();assert.equal(editor.element.querySelector('.report-annotation'),null);assert.match(editor.reviewPanel.querySelector('[role=status]').textContent,/0 avisos/);
 await window.happyDOM.close();
});

test('rediseño: reloj y carga visibles, cancelación y respuesta tardía no reabren avisos',async()=>{
 const {window,editor,button}=setup({globalReview:true});
 editor.element.textContent='Informe sintético.';editor.element.dispatchEvent(new window.Event('input'));
 let finish;globalThis.fetch=async()=>({ok:true,json:()=>new Promise(resolve=>{finish=resolve;})});
 const reviewing=button('Revisar con IA').onclick();await new Promise(r=>setTimeout(r,0));
 assert.equal(editor.reviewPanel.dataset.busy,'true');assert.equal(document.querySelector('.review-progress').hidden,false);assert.equal(button('Revisando…').getAttribute('aria-busy'),'true');
 await new Promise(r=>setTimeout(r,1050));assert.match(document.querySelector('.review-elapsed').textContent,/00:01/);
 button('Cancelar revisión').click();assert.equal(editor.reviewPanel.dataset.busy,'false');assert.equal(document.querySelector('.review-progress').hidden,true);assert.equal(document.querySelector('.review-elapsed').hidden,true);
 finish({id:'late',status:'completed',suggestions:[]});await reviewing;assert.equal(editor.reviewPanel.dataset.busy,'false');assert.match(editor.reviewPanel.querySelector('[role=status]').textContent,/cancelled/);
 await window.happyDOM.close();
});
