import {Window} from 'happy-dom';
import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {once} from 'node:events';
import {createLab} from '../backend/lab.mjs';
import {createReviewer,validateReview} from '../backend/meta-review.mjs';
import {reviewContext,validateReportEvidence} from '../backend/review-context.mjs';
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('timeout');};
const text='Hallazgos: nódulo derecho. Conclusión: nódulo izquierdo.';
const warning={kind:'contradiction',original:'nódulo derecho',replacement:null,category:'sensitive',reason:'Comprobar si es el mismo hallazgo.',evidence:['nódulo derecho','nódulo izquierdo']};

test('global proposals require evidence and preserve protected numbers and laterality',()=>{
 const original='35 mili. Milímetros de espesor.';
 const s={original,replacement:'35 milímetros de espesor.',category:'grammar',kind:'format',reason:'Unidad truncada y repetida.',evidence:[original]};
 assert.equal(validateReportEvidence(JSON.stringify({suggestions:[s]}),original,validateReview)[0].replacement,s.replacement);
 for(const replacement of ['50 milímetros de espesor.','35 centímetros de espesor.'])assert.equal(validateReportEvidence(JSON.stringify({suggestions:[{...s,replacement}]}),original,validateReview)[0].replacement,null);
 assert.throws(()=>validateReportEvidence(JSON.stringify({suggestions:[{...s,reason:''}]}),original,validateReview));
});

test('global UI applies only explicit acceptance and blocks stale proposals',async()=>{
 const window=new Window();const elements=[];const el=tag=>{const n=window.document.createElement(tag);elements.push(n);return n;};
 let state={text:'35 mili. Milímetros.',pending:false,context:null},applied=0;
 const response={id:'test',status:'completed',suggestions:[{original:state.text,replacement:'35 milímetros.',kind:'format',reason:'Unidad repetida.',evidence:[state.text]}]};
 const ctx={window,CustomEvent:window.CustomEvent,document:{createElement:el},setInterval,clearInterval,performance:{now:()=>100},setTimeout,clearTimeout,encodeURIComponent,fetch:async()=>({ok:true,json:async()=>response})};
 vm.createContext(ctx);vm.runInContext(("const tr=(s,...v)=>Array.isArray(s)?s.reduce((a,b,i)=>a+(i?v[i-1]:'')+b,''):s;const language=()=> 'es';const initializeLanguage=()=>{};const mountLanguageSwitch=()=>({});\n"+fs.readFileSync('apps/desktop/report-review.js','utf8').replace(/^import .*;\r?\n/gm,'')).replace('export function','function'),ctx);
 ctx.args={controls:el('div'),section:el('section'),copyButton:el('button'),snapshot:()=>state,onCopy(){},event(){},onApply:p=>{applied++;assert.equal(p.original,state.text);state={...state,text:p.replacement};return true;}};
 ctx.args.controls.append(ctx.args.copyButton);vm.runInContext('mountReportReview(args)',ctx);
 await elements.find(n=>n.textContent==='Revisar de nuevo').onclick();assert.equal(applied,0);
 const accept=elements.find(n=>n.textContent==='Aceptar');assert.ok(accept);accept.onclick();assert.equal(applied,1);assert.equal(state.text,'35 milímetros.');
 accept.onclick();assert.equal(applied,1);
});

test('one click requests review; concurrent clicks and current results do not resend',async()=>{
 const window=new Window();const elements=[];const el=tag=>{const n=window.document.createElement(tag);elements.push(n);return n;};
 let calls=0,resolve;let state={text:'Texto.',pending:false,context:null};
 const ctx={window,CustomEvent:window.CustomEvent,document:{createElement:el},setInterval,clearInterval,performance:{now:()=>100},setTimeout,clearTimeout,encodeURIComponent,fetch:async()=>{calls++;return {ok:true,json:()=>new Promise(r=>resolve=r)};}};
 vm.createContext(ctx);vm.runInContext(("const tr=(s,...v)=>Array.isArray(s)?s.reduce((a,b,i)=>a+(i?v[i-1]:'')+b,''):s;const language=()=> 'es';const initializeLanguage=()=>{};const mountLanguageSwitch=()=>({});\n"+fs.readFileSync('apps/desktop/report-review.js','utf8').replace(/^import .*;\r?\n/gm,'')).replace('export function','function'),ctx);
 ctx.args={controls:el('div'),section:el('section'),copyButton:el('button'),snapshot:()=>state,onCopy(){},event(){}};
 ctx.args.controls.append(ctx.args.copyButton);vm.runInContext('mountReportReview(args)',ctx);
 const button=elements.find(n=>n.className==='report-review-button');const pending=button.onclick();assert.equal(calls,1);button.onclick();assert.equal(calls,1);
 await wait(()=>!!resolve);resolve({id:'one',status:'completed',suggestions:[]});await pending;
 button.onclick();assert.equal(calls,1);
 state={...state,text:'Editado.'};resolve=null;const next=button.onclick();assert.equal(calls,2);await wait(()=>!!resolve);resolve({id:'two',status:'completed',suggestions:[]});await next;
});
test('contexto acotado, sin rutas ni metadatos arbitrarios; revisión global exige citas y nunca sustituye',()=>{
 const c=reviewContext({templateName:'TC tórax',reportText:'Previo',path:'PRIVADO',reference:'NO ENVIAR'});
 assert.equal(c.path,undefined);assert.equal(c.reference,undefined);assert.equal(c.reportText,'Previo');
 assert.throws(()=>reviewContext({reportText:'x'.repeat(10001)}));
 assert.throws(()=>reviewContext({templateName:12}));
 assert.equal(validateReportEvidence(JSON.stringify({suggestions:[warning]}),text,validateReview)[0].replacement,null);
 for(const s of [{...warning,replacement:'nódulo izquierdo'},{...warning,evidence:['inexistente']}])assert.throws(()=>validateReportEvidence(JSON.stringify({suggestions:[s]}),text,validateReview));
 for(const s of [{...warning,kind:'completeness'},{...warning,evidence:['nódulo derecho']},{...warning,evidence:['nódulo derecho','nódulo derecho']}])assert.throws(()=>validateReportEvidence(JSON.stringify({suggestions:[s]}),text,validateReview));
 assert.equal(validateReportEvidence(JSON.stringify({suggestions:[warning]}),text,validateReview)[0].kind,'contradiction');
});
test('toma conserva contexto inmutable; global conserva snapshot, deduplica y registra fallos',async()=>{
 const inputs=[],db={runs:[{id:'r',status:'completed',text:'Ate tacia.',configuration:{keywords:[]},reviewContext:{templateName:'TC',reportText:'Hallazgos previos.'}}]};
 const q=createReviewer({db,save(){},getKey:()=>'',provider:async input=>{inputs.push(structuredClone(input));return {content:JSON.stringify({suggestions:input.reviewScope==='report'?[warning]:[]})};}});
 try{const take=q.enqueue('r');db.runs[0].reviewContext.reportText='CAMBIADO';await wait(()=>take.status==='completed');assert.equal(inputs[0].context.reportText,'Hallazgos previos.');
 const global=q.enqueueReport({text,context:{templateName:'TC'}});assert.equal(q.enqueueReport({text,context:{templateName:'TC'}}).id,global.id);await wait(()=>global.status==='completed');assert.equal(global.baseText,text);assert.equal(global.suggestions[0].evidence.length,2);assert.ok(global.timings.requestMs>=0);assert.equal(global.config.reasoning_effort,'medium');assert.equal(global.config.max_completion_tokens,8000);assert.equal(global.config.promptVersion,'report-consistency-v5-bilingual');
 assert.notEqual(q.enqueueReport({text,context:{templateName:'RM'}}).inputHash,global.inputHash);
 global.config.promptHash='previous-prompt';assert.notEqual(q.enqueueReport({text,context:{templateName:'TC'}}).id,global.id);
 assert.throws(()=>q.enqueueReport({text:' '}));assert.throws(()=>q.enqueueReport({text:'x'.repeat(20001)}));
 }finally{q.close();}
});
test('API global: origen, exportación, lectura aislada y validación de respuesta',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-global-'));let invalid=false;
 const lab=createLab({dataDir:dir,keyFile:path.join(dir,'.env.local'),worker:{close(){}},reviewProvider:async()=>({content:JSON.stringify({suggestions:[invalid?{...warning,evidence:['inventado']}:warning]})})});
 lab.server.listen(0,'127.0.0.1');await once(lab.server,'listening');const origin=`http://127.0.0.1:${lab.server.address().port}`;
 const post=(body,o=origin)=>fetch(origin+'/api/report-reviews',{method:'POST',headers:{Origin:o},body:JSON.stringify(body)});
 try{assert.equal((await post({text},'https://evil.invalid')).status,403);const response=await post({text,context:{templateName:'TC'}});assert.equal(response.status,202);const r=await response.json();await wait(()=>lab.db.reviews[0].status==='completed');
 assert.equal((await(await fetch(origin+'/api/report-reviews/'+r.id)).json()).suggestions.length,1);
 const exp=await(await fetch(origin+'/api/export')).json();assert.equal(exp.reviews[0].scope,'report');assert.equal(exp.runs.length,0);
 invalid=true;await post({text,context:{templateName:'otra'}});await wait(()=>lab.db.reviews[1].status==='error');assert.equal(lab.db.reviews[1].baseText,text);
 }finally{lab.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('UI: copiar ofrece revisar o continuar; edición invalida avisos y respuestas tardías no rehabilitan copia',async()=>{
 const window=new Window();const elements=[];const el=tag=>{const n=window.document.createElement(tag);elements.push(n);return n;};
 let snapshot={text:'Texto original.',context:{templateName:'TC'},pending:false},copies=0,calls=0,resolveReview;
 const box={window,CustomEvent:window.CustomEvent,document:{createElement:el},setInterval,clearInterval,performance:{now:()=>100},setTimeout,clearTimeout,encodeURIComponent,fetch:async()=>{calls++;return {ok:true,json:()=>new Promise(r=>{resolveReview=r;})};}};
 vm.createContext(box);vm.runInContext(("const tr=(s,...v)=>Array.isArray(s)?s.reduce((a,b,i)=>a+(i?v[i-1]:'')+b,''):s;const language=()=> 'es';const initializeLanguage=()=>{};const mountLanguageSwitch=()=>({});\n"+fs.readFileSync('apps/desktop/report-review.js','utf8').replace(/^import .*;\r?\n/gm,'')).replace('export function','function'),box);
 box.args={controls:el('div'),section:el('section'),copyButton:el('button'),snapshot:()=>snapshot,onCopy:()=>copies++,event(){}};
 box.args.controls.append(box.args.copyButton);const ui=vm.runInContext('mountReportReview(args)',box);
 assert.equal(ui.beforeCopy(),false);assert.equal(calls,0);
 elements.find(n=>n.textContent==='Copiar sin revisar').onclick();assert.equal(copies,1);
 const pending=elements.find(n=>n.textContent==='Revisar de nuevo').onclick();await wait(()=>typeof resolveReview==='function');
 snapshot={...snapshot,text:'Texto modificado.'};ui.changed();resolveReview({id:'r',status:'completed',suggestions:[]});await pending;
 assert.equal(ui.beforeCopy(),false);assert.equal(copies,1);
 assert.ok(elements.some(n=>String(n.textContent).includes('Puedes revisar')));
 snapshot={...snapshot,pending:true};ui.changed();elements.find(n=>n.textContent==='Copiar sin revisar').onclick();assert.equal(copies,1);
});
test('contexto v2: descarta texto de plantilla y acepta ficha y sección acotadas',()=>{
 const c=reviewContext({templateName:'TC tórax',templateOrigin:'importada',templateText:'PLANTILLA PRIVADA',sectionTitle:'HALLAZGOS',sectionText:'Sin derrame.'});
 assert.equal(c.version,'report-context-v2');assert.equal(c.templateText,undefined);assert.equal(JSON.stringify(c).includes('PLANTILLA PRIVADA'),false);
 assert.equal(c.templateOrigin,'importada');assert.equal(c.sectionTitle,'HALLAZGOS');assert.equal(c.sectionText,'Sin derrame.');
 assert.throws(()=>reviewContext({sectionText:'x'.repeat(3001)}));assert.throws(()=>reviewContext({sectionTitle:'x'.repeat(201)}));
 assert.throws(()=>reviewContext({templateOrigin:'otra'}));
});

test('global: omite dudas vagas y propuestas idénticas, conserva interpretación protegida y contradicción',()=>{
 const text='Lesión de siete milimetrijilos. Hallazgo derecho. Hallazgo izquierdo.';
 const base={original:'milimetrijilos',replacement:null,category:'terminology',kind:'ambiguous_term',reason:'Término dudoso.',evidence:['milimetrijilos']};
 const validate=s=>validateReportEvidence(JSON.stringify({suggestions:s}),text,validateReview);
 assert.deepEqual(validate([base]),[]);
 assert.deepEqual(validate([{...base,replacement:'milimetrijilos'}]),[]);
 const protectedProposal=validate([{...base,replacement:'milímetros'}])[0];
 assert.equal(protectedProposal.replacement,null);assert.equal(protectedProposal.proposedReplacement,'milímetros');assert.equal(protectedProposal.guarded,true);
 const contradiction={original:'Hallazgo derecho.',replacement:null,category:'sensitive',kind:'contradiction',reason:'Lados incompatibles para el mismo hallazgo.',evidence:['Hallazgo derecho.','Hallazgo izquierdo.']};
 assert.equal(validate([base,contradiction]).length,1);
 assert.throws(()=>validate([{...contradiction,evidence:['Hallazgo derecho.']}]).length===1);
});

test('global contabiliza dudas suprimidas y no reutiliza resultado de otro esfuerzo',async()=>{
 const db={runs:[]};const provider=async()=>({content:JSON.stringify({suggestions:[{original:'Término dudoso.',replacement:null,category:'sensitive',kind:'ambiguous_term',reason:'Sin alternativa concreta.',evidence:['Término dudoso.']}]})});
 const q=createReviewer({db,save(){},getKey:()=>'',provider});
 try{
 const r=q.enqueueReport({text:'Término dudoso.'});await wait(()=>r.status==='completed');
 assert.equal(r.suggestions.length,0);assert.equal(r.suppressedSuggestionCount,1);
 r.config.reasoning_effort='low';
 const next=q.enqueueReport({text:'Término dudoso.'});assert.notEqual(next.id,r.id);
 await wait(()=>next.status==='completed');
 }finally{q.close();}
});
