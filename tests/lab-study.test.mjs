import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudy,clinicalSummary,studyCsv,comparePair} from '../backend/lab-study.mjs';
import {createLab} from '../backend/lab.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
function fixture(){const db={runs:[{id:'run',audioId:'a',status:'completed',text:'No hay lesión',formatting:{text:'No hay lesión.'}}],audios:[{id:'a',references:[{version:1,text:'No hay lesión'}]}],reviewDocuments:[{runId:'run',revision:1,text:'No hay lesión.'}],reviews:[{id:'review',runId:'run',status:'completed',baseText:'No hay lesion',suggestions:[{id:'s',original:'lesion',replacement:'lesión'}]}]};let saved=0;const study=createStudy({db,save:()=>saved++,build:'fixture',sourceHash:'fixture'});const base={syntheticOnly:true,evaluator:'E1',runId:'run',stage:'asr'};return {db,study,base,saved:()=>saved};}
test('anotación: denominadores excluyen inserciones/no evaluables y preserva snapshots',()=>{
 const {db,study,base}=fixture();const r=study.append({...base,kind:'clinical',rows:[{id:'1',category:'negation',outcome:'correct',expected:'No',observed:'No'},{id:'2',category:'negation',outcome:'insertion',expected:'',observed:'no'},{id:'3',category:'negation',outcome:'unevaluable',expected:'',observed:''}]});
 assert.equal(r.summary.negation.accuracy,1);assert.equal(r.summary.negation.insertion,1);assert.equal(r.summary.measure.accuracy,null);
 db.audios[0].references[0].text='otra referencia';assert.equal(r.reference.text,'No hay lesión');assert.equal(db.runs[0].text,'No hay lesión');
 assert.throws(()=>study.append({...base,kind:'clinical',rows:[{id:'1',category:'bad',outcome:'correct',expected:'',observed:''}]}));
 assert.equal(clinicalSummary([]).laterality.errorRate,null);
});
test('edición separada, snapshot desactualizado, deduplicación y ausentes',()=>{
 const {db,study,base,saved}=fixture();const target=study.snapshot(base);
 const m={...base,kind:'editing',clientId:'once',snapshotHash:target.snapshotHash,finalText:'No hay lesión.',status:'approved',elapsedMs:1200,inputEvents:2,hiddenCount:0};
 const r=study.append(m);assert.equal(study.append(m).id,r.id);assert.equal(saved(),1);assert.equal(db.runs[0].text,'No hay lesión');assert.equal(r.evaluation.wer,0);
 assert.equal(study.snapshot({...base,stage:'edited',editId:r.id}).text,r.finalText);
 assert.throws(()=>study.append({...m,clientId:'new',elapsedMs:-1}));
 assert.throws(()=>study.append({...m,clientId:'new',snapshotHash:'stale'}));
 assert.throws(()=>study.append({...m,clientId:'new',syntheticOnly:false}));
 assert.match(studyCsv([r]),/snapshotHash/);
});
test('revisor: juicios humanos, denominadores vacíos y límites',()=>{
 const {study,base}=fixture();const m={...base,kind:'review',stage:'reviewed',reviewId:'review',beforeErrors:0,detected:0,corrected:0,introduced:1,residual:1,verdicts:[{id:'s',verdict:'incorrect'}]};
 const r=study.append(m);assert.equal(r.summary.sensitivity,null);assert.equal(r.summary.precision,0);assert.equal(r.summary.introduced,1);
 assert.throws(()=>study.append({...m,detected:1}));assert.throws(()=>study.append({...m,verdicts:[]}));
});
test('usabilidad: datos observados distintos de rendimiento del motor',()=>{
 const {study,base}=fixture();const r=study.append({...base,kind:'usability',task:'A',variant:'v1',status:'failed',elapsedMs:3000,clicks:3,errors:1,hiddenCount:0});
 assert.equal(r.runId,undefined);assert.equal(r.elapsedMs,3000);assert.equal(r.environment.network,null);assert.equal(r.status,'failed');
});
test('pares: mismo audio/modo/carga/referencia, delta firmado y ausentes',()=>{
 const a={id:'a',audioId:'one',status:'completed',configuration:{mode:'file'},result:{cold:false},evaluationReferenceVersion:1,evaluation:{wer:.2,cer:.1},timings:{requestMs:100}};
 const b={...a,id:'b',evaluation:{wer:.1,cer:.05},timings:{requestMs:80}};
 assert.equal(comparePair(a,b).delta.wer,-.1);assert.equal(comparePair(a,b).delta.requestMs,-20);assert.equal(comparePair(a,b).delta.endToFinalMs,null);
 for(const patch of [{audioId:'other'},{configuration:{mode:'streaming'}},{result:{cold:true}},{evaluationReferenceVersion:2},{status:'error'}])assert.throws(()=>comparePair(a,{...b,...patch}));
});
test('API estudio: guardas, exportación, reinicio y catálogo anterior preservado',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-study-'));let lab;
 const start=async()=>{lab=createLab({dataDir:dir,keyFile:path.join(dir,'unused.env'),worker:{close(){}}});lab.server.listen(0,'127.0.0.1');await once(lab.server,'listening');return `http://127.0.0.1:${lab.server.address().port}`;};
 const close=async()=>{const done=once(lab.server,'close');lab.close();await done;};
 try{let base=await start();const {db}=fixture();lab.db.runs.push(...db.runs);lab.db.audios.push(...db.audios);
  const post=(body,origin=base)=>fetch(base+'/api/study',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});
  const m={syntheticOnly:true,evaluator:'E1',kind:'editing',runId:'run',stage:'asr',status:'approved',finalText:'Texto editado',elapsedMs:5,inputEvents:1,hiddenCount:0};
  assert.equal((await post(m,'https://external.invalid')).status,403);assert.equal((await post({...m,elapsedMs:-1})).status,400);assert.equal((await post(m)).status,201);
  const out=await (await fetch(base+'/api/export')).json();assert.equal(out.runs[0].text,'No hay lesión');assert.equal(out.studyRecords[0].finalText,'Texto editado');
  assert.match(await (await fetch(base+'/api/study/export?format=csv')).text(),/editing/);
  await close();base=await start();const restored=await (await fetch(base+'/api/study')).json();assert.equal(restored.records.length,1);assert.equal(restored.records[0].text,'No hay lesión');
 }finally{if(lab.server.listening)await close();fs.rmSync(dir,{recursive:true,force:true});}
});
