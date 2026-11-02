import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {once} from 'node:events';
import {createLab} from '../backend/lab.mjs';
import {createReviewer,validateReview} from '../backend/meta-review.mjs';
import {reviewContext,validateReportEvidence} from '../backend/review-context.mjs';
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('timeout');};
const text='Hallazgos: nódulo derecho. Conclusión: nódulo izquierdo.';
const warning={kind:'contradiction',original:'nódulo derecho',replacement:null,category:'sensitive',reason:'Comprobar si es el mismo hallazgo.',evidence:['nódulo derecho','nódulo izquierdo']};
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
 const global=q.enqueueReport({text,context:{templateName:'TC'}});assert.equal(q.enqueueReport({text,context:{templateName:'TC'}}).id,global.id);await wait(()=>global.status==='completed');assert.equal(global.baseText,text);assert.equal(global.suggestions[0].evidence.length,2);assert.ok(global.timings.requestMs>=0);assert.equal(global.config.promptVersion,'report-consistency-v2-evidence-only');
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
 const elements=[];
 function el(tag){const n={tag,textContent:'',hidden:false,dataset:{},append(...x){},setAttribute(){},insertBefore(){},replaceChildren(){}};elements.push(n);return n;}
 let snapshot={text:'Texto original.',context:{templateName:'TC'},pending:false},copies=0,calls=0,resolveReview;
 const box={document:{createElement:el},performance:{now:()=>100},setTimeout,clearTimeout,encodeURIComponent,fetch:async()=>{calls++;return {ok:true,json:()=>new Promise(r=>{resolveReview=r;})};}};
 vm.createContext(box);vm.runInContext(fs.readFileSync('apps/desktop/report-review.js','utf8').replace('export function','function'),box);
 box.args={controls:el('div'),section:el('section'),copyButton:el('button'),snapshot:()=>snapshot,onCopy:()=>copies++,event(){}};
 const ui=vm.runInContext('mountReportReview(args)',box);
 assert.equal(ui.beforeCopy(),false);assert.equal(calls,0);
 elements.find(n=>n.textContent==='Copiar sin revisar').onclick();assert.equal(copies,1);
 const pending=elements.find(n=>n.textContent==='Enviar a Meta y revisar').onclick();await wait(()=>typeof resolveReview==='function');
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
