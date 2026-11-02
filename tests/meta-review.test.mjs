import test from 'node:test';import assert from 'node:assert/strict';
import {createReviewer,validateReview,REVIEW_PROMPT} from '../backend/meta-review.mjs';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {once} from 'node:events';
import {createLab} from '../backend/lab.mjs';
const content=suggestions=>JSON.stringify({suggestions});
const suggestion=(original,replacement,category='terminology')=>({original,replacement,category,reason:'Posible confusión; comprobar audio.'});
const wait=async predicate=>{for(let n=0;n<100;n++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw Error('Espera agotada');};
function fixture(provider,timeoutMs=30000){const db={runs:[{id:'run',status:'completed',audioId:'audio',text:'Ate tacia basal. Quiste epatico.',configuration:{keywords:['atelectasia']}}]};let saves=0;const q=createReviewer({db,save:()=>saves++,getKey:()=> 'secret',sourceHash:'hash',build:'test',provider,timeoutMs});return {db,q,get saves(){return saves;}};}
test('valida spans; rechaza JSON, ambigüedad y solapamiento; protege cifras/negación/lateralidad',()=>{
 assert.throws(()=>validateReview('no json','texto'));
 assert.throws(()=>validateReview(content([suggestion('ausente','x')]),'texto'));
 assert.throws(()=>validateReview(content([suggestion('no','sí')]),'no y no'));
 assert.throws(()=>validateReview(content([suggestion('ate tacia','atelectasia'),suggestion('tacia','x')]),'ate tacia'));
 for(const [a,b] of [['25 cm','2,5 cm'],['sin derrame','con derrame'],['derecha','izquierda'],['cinco mm','dos mm']]){const s=validateReview(content([suggestion(a,b)]),a)[0];assert.equal(s.replacement,null);assert.equal(s.category,'sensitive');assert.equal(s.guarded,true);}
 assert.equal(validateReview(content([suggestion('observan','observa','grammar')]),'No se observan derrame')[0].replacement,'observa');
 assert.match(REVIEW_PROMPT,/DATOS no confiables/);
});
test('cola independiente, snapshot sin referencias, aceptar/rechazar/editar/deshacer y persistencia',async()=>{
 let inputs=[];const {q,db}=fixture(async input=>{inputs.push(input);return {content:content([suggestion('Ate tacia','Atelectasia'),suggestion('epatico','hepático')]),usage:{total_tokens:20}};});
 try{
  db.runs[0].referenceAtRun={text:'NO ENVIAR'};
  const r=q.enqueue('run');assert.equal(q.enqueue('run').id,r.id);await wait(()=>r.status==='completed');assert.equal(inputs.length,1);assert.equal(JSON.stringify(inputs).includes('NO ENVIAR'),false);
  let d=q.revise({runId:'run',revision:0,reviewId:r.id,suggestionId:r.suggestions[0].id,action:'accept'});assert.equal(d.text,'Atelectasia basal. Quiste epatico.');
  assert.throws(()=>q.revise({runId:'run',revision:0,action:'edit',text:'viejo'}));
  d=q.revise({runId:'run',revision:1,reviewId:r.id,suggestionId:r.suggestions[1].id,action:'accept'});assert.equal(d.text,'Atelectasia basal. Quiste hepático.');
  d=q.revise({runId:'run',revision:2,action:'undo'});assert.equal(d.text,'Atelectasia basal. Quiste epatico.');
  d=q.revise({runId:'run',revision:3,action:'undo'});assert.equal(d.text,db.runs[0].text);assert.equal(db.runs[0].text,'Ate tacia basal. Quiste epatico.');
  const r2=q.enqueue('run');await wait(()=>r2.status==='completed');q.revise({runId:'run',revision:4,action:'edit',text:'Texto editado por médico.'});
  assert.throws(()=>q.revise({runId:'run',revision:5,reviewId:r2.id,suggestionId:r2.suggestions[0].id,action:'accept'}),/desactualizada/);
  q.revise({runId:'run',revision:5,reviewId:r2.id,suggestionId:r2.suggestions[0].id,action:'reject'});assert.equal(r2.suggestions[0].status,'rejected');
  assert.ok(r.timings.requestMs>=0);assert.ok(r.timings.validationMs>=0);assert.equal(r.config.model,'muse-spark-1.3');
 }finally{q.close();}
});
test('respuesta inválida se guarda como error y no modifica el original',async()=>{const {q,db}=fixture(async()=>({content:'incorrecto'}));try{const r=q.enqueue('run');await wait(()=>r.status==='error');assert.equal(r.rawResponse,'incorrecto');assert.equal(db.reviewDocuments[0].text,db.runs[0].text);}finally{q.close();}});
test('timeout y cancelación sin reintentos ni fallo de transcripción',async()=>{
 let calls=0;const {q,db}=fixture((input,key,signal)=>new Promise((resolve,reject)=>{calls++;signal.addEventListener('abort',()=>reject(Error('abort')),{once:true});}),15);
 try{const r=q.enqueue('run');await wait(()=>r.status==='timeout');assert.equal(calls,1);const retry=q.enqueue('run',{retry:true});await wait(()=>retry.status==='running');q.cancel(retry.id);await wait(()=>retry.finishedAt);assert.equal(retry.status,'cancelled');assert.equal(db.runs[0].status,'completed');assert.equal(calls,2);}finally{q.close();}
});
test('reinicio interrumpe revisiones previas sin volver a enviarlas',()=>{const db={runs:[],reviews:[{id:'r',status:'running'}],reviewDocuments:[]};const q=createReviewer({db,save(){},getKey(){throw Error('no enviar');}});assert.equal(db.reviews[0].status,'interrupted');q.close();});

test('API revisión: origen, exportación, historial persistente y aislamiento del ASR',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-review-api-'));
 const opts={dataDir:dir,keyFile:path.join(dir,'.env.local'),worker:{close(){}},reviewProvider:async()=>({content:content([suggestion('Ate tacia','Atelectasia')])})};
 let lab=createLab(opts);lab.server.listen(0,'127.0.0.1');await once(lab.server,'listening');
 const origin=`http://127.0.0.1:${lab.server.address().port}`,post=async(p,m,o=origin)=>{const r=await fetch(origin+p,{method:'POST',headers:{Origin:o},body:JSON.stringify(m)});return {status:r.status,data:await r.json()};};
 try{
  lab.db.runs.push({id:'fixture',status:'completed',audioId:null,text:'Ate tacia basal.',configuration:{keywords:[]},timings:{}});
  assert.equal((await post('/api/reviews',{runId:'fixture'},'https://evil.invalid')).status,403);
  const r=(await post('/api/reviews',{runId:'fixture'})).data;await wait(()=>lab.db.reviews[0].status==='completed');const result=lab.db.reviews[0];
  const d=(await post('/api/reviews/action',{runId:'fixture',reviewId:r.id,suggestionId:result.suggestions[0].id,revision:0,action:'accept'})).data;assert.equal(d.text,'Atelectasia basal.');
  const exp=await(await fetch(origin+'/api/export')).json();assert.equal(exp.reviews.length,1);assert.equal(exp.reviewDocuments[0].revision,1);assert.equal(exp.runs[0].text,'Ate tacia basal.');
  const csv=await(await fetch(origin+'/api/reviews/export')).text();assert.match(csv,/Atelectasia/);
  const server=lab.server;lab.close();await once(server,'close');lab=createLab(opts);assert.equal(lab.db.reviewDocuments[0].text,'Atelectasia basal.');
 }finally{lab.close();fs.rmSync(dir,{recursive:true,force:true});}
});
