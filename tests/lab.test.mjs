import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {wavInfo,score,configuration,csv} from '../backend/lab-core.mjs';
import {createLab,museTranscribe} from '../backend/lab.mjs';
function wav(){const b=Buffer.alloc(64044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(64000,40);return b;}
test('comandos: original, formato opcional, auditoría y exportación persistidos',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-commands-'));
 const lab=createLab({dataDir:dir,keyFile:path.join(dir,'.env.local'),worker:{call:async m=>{fs.copyFileSync(m.input,m.output);},close(){}},reviewProvider:async()=>({content:'{"suggestions":[]}'}),muse:async()=>({text:'no hay derrame punto nuevo párrafo nódulo de dos coma cinco milímetros'})});
 lab.server.listen(0,'127.0.0.1');await once(lab.server,'listening');const base=`http://127.0.0.1:${lab.server.address().port}`;
 const post=async(p,body)=>{const r=await fetch(base+p,{method:'POST',headers:{Origin:base},body:Buffer.isBuffer(body)?body:JSON.stringify(body)});assert.ok(r.ok);return r.json();};
 try{
  await post('/api/key',{key:'fixture'});const audio=await post('/api/audio',wav());const state=await (await fetch(base+'/api/state')).json();const config=state.configs.find(c=>c.engine==='muse');
  for(const commandsEnabled of [true,false])await post('/api/runs',{audioIds:[audio.id],configIds:[config.id],repeats:1,commandsEnabled,numbersEnabled:commandsEnabled,reviewEnabled:commandsEnabled});
  for(let i=0;i<100&&lab.db.runs.some(r=>['queued','running'].includes(r.status));i++)await new Promise(r=>setTimeout(r,10));
  for(let i=0;i<100&&lab.db.reviews[0]?.status!=='completed';i++)await new Promise(r=>setTimeout(r,5));assert.equal(lab.db.reviews.length,1);assert.equal(lab.db.reviews[0].status,'completed');
  const out=await (await fetch(base+'/api/export')).json();const [on,off]=out.runs;
  assert.equal(on.status,'completed');assert.equal(off.status,'completed');assert.equal(on.text,off.text);
  assert.equal(on.formatting.text,'No hay derrame.\n\nNódulo de 2,5 milímetros');assert.equal(on.formatting.events.length,2);assert.equal(off.formatting,null);assert.equal(off.numberFormatting,null);assert.equal(on.numberFormatting.events.length,1);assert.ok(on.timings.numberFormatMs>=0);assert.ok(on.text.includes('dos coma cinco'));assert.equal(off.timings.commandMs,0);
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'catalog.json'),'utf8'));assert.deepEqual(saved.runs[0].formatting,on.formatting);
  const csv=await (await fetch(base+'/api/export?format=csv')).text();assert.ok(csv.includes('formattedText'));assert.ok(csv.includes('No hay derrame.\n\nNódulo de 2,5 milímetros'));
 }finally{const closed=once(lab.server,'close');lab.close();await closed;fs.rmSync(dir,{recursive:true,force:true});}
});
test('WAV rechaza truncamiento y formato no PCM16',()=>{assert.equal(wavInfo(wav()).durationMs,2000);assert.throws(()=>wavInfo(wav().subarray(0,100)));const b=wav();b.writeUInt16LE(3,20);assert.throws(()=>wavInfo(b));});
test('WER conserva negaciones, decimales, unidades y referencia vacía explícita',()=>{assert.equal(score(null,'texto'),null);assert.equal(score('No hay lesión.','hay lesión').deletions,1);assert.equal(score('3,5 mm','35 mm').substitutions,1);assert.equal(score('5 %','5').deletions,1);assert.equal(score('','palabra').silenceInsertions,1);assert.equal(score('','').wer,null);assert.equal(score('NÓDULO.','nódulo').wer,0);});
test('configuración versionada y CSV sin fórmulas ejecutables',()=>{const first={...configuration({engine:'whisper',name:'base'}),id:'one'};assert.equal(configuration({engine:'whisper',name:'v2',beams:1},first).version,2);assert.equal(first.beams,1);assert.throws(()=>configuration({engine:'whisper',name:'x',beams:3}));assert.throws(()=>configuration({engine:'whisper',name:'x',keywords:['a']}));assert.match(csv([{text:'=1+1'}]),/\t=1\+1/);});
test('Muse: contrato multipart y error remoto sin filtrar cuerpo del proveedor',async()=>{
 const real=globalThis.fetch;let failed=false;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.meta.ai/v1/asr/transcribe');assert.equal(options.headers.Authorization,'Bearer test');const request=JSON.parse(await options.body.get('request').text());assert.equal(request.model,'muse-voice-transcribe-1.0');assert.equal(request.mode,'PUSH_TO_TALK');assert.deepEqual(request.languageBias,['Spanish']);assert.deepEqual(request.keywords,['pleural']);assert.equal(options.body.get('audio').size,wav().length);return failed?new Response('secret-provider-body',{status:403}):Response.json({transcript:'texto',audioDurationMs:2000});};
 try{const c=configuration({engine:'muse',name:'base',keywords:['pleural']});assert.equal((await museTranscribe(wav(),c,'test')).text,'texto');failed=true;await assert.rejects(museTranscribe(wav(),c,'test'),e=>e.message.includes('403')&&!e.message.includes('secret-provider-body'));}finally{globalThis.fetch=real;}
});
test('API: origen, deduplicación, versiones, cola, exportación, cancelación y persistencia',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-lab-test-'));let lab;
 const worker={call:async m=>{fs.copyFileSync(m.input,m.output);return {};},close(){}};
 let fail=false,slow=false;
 const muse=async(w,c,k,signal)=>{assert.equal(k,'test-secret');if(fail)throw Error('fixture failure');if(slow)await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,1000);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(Error('cancel'));},{once:true});});return {text:'no hay lesión'};};
 async function start(){lab=createLab({dataDir:dir,keyFile:path.join(dir,'.env.local'),worker,muse});lab.server.listen(0,'127.0.0.1');await once(lab.server,'listening');return `http://127.0.0.1:${lab.server.address().port}`;}
 let base=await start();const post=async(p,data,headers={})=>fetch(base+p,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:Buffer.isBuffer(data)?data:JSON.stringify(data)});const state=async()=> (await fetch(base+'/api/state')).json();
 async function finished(){for(let i=0;i<100;i++){const s=await state();if(s.runs.every(r=>!['queued','running'].includes(r.status)))return s;await new Promise(r=>setTimeout(r,10));}throw Error('timeout');}
 try{
  assert.equal((await post('/api/key',{key:'test-secret'},{Origin:'https://evil.invalid'})).status,403);
  await post('/api/key',{key:'test-secret'});
  const a=await (await post('/api/audio',wav())).json();assert.equal((await (await post('/api/audio',wav())).json()).id,a.id);
  await post('/api/references',{audioId:a.id,text:'no hay lesión'});
  let s=await state();const c=s.configs.find(c=>c.engine==='muse');
  const c2=await (await post('/api/configs',{engine:'muse',name:'terms',parentId:c.id,keywords:['lesión']})).json();assert.equal(c2.version,2);
  const selection={audioIds:[a.id],configIds:[c.id,c2.id],repeats:2};assert.equal((await post('/api/runs',selection)).status,202);
  s=await finished();assert.equal(s.runs.length,4);assert.ok(s.runs.every(r=>r.status==='completed'&&r.evaluation.wer===0&&r.timings.totalMs>0));assert.deepEqual(s.runs.map(r=>r.configId),[c.id,c2.id,c2.id,c.id]);
  assert.ok(s.runs.every(r=>r.text==='no hay lesión'&&r.formatting.text==='No hay lesión'&&r.commandVersion==='es-basic-v1'&&r.timings.commandMs>=0));
  assert.equal((await post('/api/live-measurements',{runId:s.runs[0].id,recordingId:1,receiveEndToTextMs:1250,stopToTextEstimateMs:-1,clockUncertaintyMs:12})).status,200);
  assert.equal((await state()).runs[0].live.stopToTextEstimateMs,null);assert.equal((await state()).runs[0].live.receiveEndToTextMs,1250);
  await post('/api/references',{audioId:a.id,text:'hay lesión'});s=await state();assert.equal(s.runs[0].referenceAtRun.version,1);assert.equal(s.runs[0].evaluationReferenceVersion,2);assert.equal(s.runs[0].evaluation.insertions,1);
  assert.ok(!(await (await fetch(base+'/api/export')).text()).includes('test-secret'));assert.ok(!fs.readFileSync(path.join(dir,'catalog.json'),'utf8').includes('test-secret'));
  fail=true;await post('/api/runs',{...selection,configIds:[c.id],repeats:1});s=await finished();assert.equal(s.runs.at(-1).status,'error');
  fail=false;slow=true;const queued=await (await post('/api/runs',{...selection,configIds:[c.id],repeats:2})).json();for(const id of queued.runIds)await post('/api/cancel',{id});s=await finished();assert.ok(s.runs.slice(-2).every(r=>r.status==='cancelled'));
  assert.equal((await fetch(base+'/.env.local')).status,404);
  const closing=once(lab.server,'close');lab.close();await closing;base=await start();s=await state();assert.equal(s.runs.length,7);assert.equal(s.audios[0].references.length,2);assert.equal(s.metaConfigured,true);
 }finally{const closing=once(lab.server,'close');lab.close();await closing;fs.rmSync(dir,{recursive:true,force:true});}
});
test('/live sirve la hoja de estilos del diseño final con tema sala por defecto y tema día explícito',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-livecss-'));
 const lab=createLab({dataDir:dir,keyFile:path.join(dir,'.env.local'),worker:{call:async()=>{},close(){}}});
 lab.server.listen(0,'127.0.0.1');await once(lab.server,'listening');const base=`http://127.0.0.1:${lab.server.address().port}`;
 try{const r=await fetch(base+'/live.css');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/css/);const css=await r.text();assert.match(css,/:root\{--mesa:#131211/);assert.match(css,/:root\[data-theme="dia"\]/);assert.doesNotMatch(css,/prefers-color-scheme/);}
 finally{lab.server.close();}
});
