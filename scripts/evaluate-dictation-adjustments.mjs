// Isolated real ASR experiment. No text correction, Spark, template or production changes.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {WebSocket} from 'ws';
import {applyFormatting} from '../backend/format-pipeline.mjs';
import {attachMuseStream} from '../backend/muse-stream.mjs';
import {loadMetaKey} from '../backend/meta-key.mjs';
import {hash,wavInfo,score} from '../backend/lab-core.mjs';
const dir=path.resolve(process.argv[2]??'data/local/dictation-breadth-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8').replace(/^\uFEFF/,''));
if(manifest.schema!=='dicta-breadth-synthetic-v1'||manifest.cases.length!==48)throw Error('Unexpected corpus');
const out=path.resolve('data/local/lab/reports/dictation-adjustments-'+Date.now());fs.mkdirSync(out,{recursive:true});
const write=(f,v)=>fs.writeFileSync(path.join(out,f),JSON.stringify(v,null,2));
const variants=[{id:'baseline',keywords:[]},{id:'balanced',keywords:['neumotórax','hemotórax','hemitórax','esteatosis','aorta','litiasis','hipodensa','hiperdensa','hemorragia','hidrocefalia']}];
const selected=new Set(['pleural-air','pleural-blood','chest-wall','liver','headings','renal','density-low','density-high','brain-negative','comparison','literal-coma','bone-negative']);
const cases=manifest.cases.filter(c=>selected.has(c.baseId)).map(c=>{const file=path.resolve(dir,c.file);if(path.dirname(file)!==dir)throw Error('Invalid file');const b=fs.readFileSync(file);if(hash(b)!==c.sha256)throw Error('Hash mismatch');const w=wavInfo(b);return {...c,pcm:b.subarray(w.offset,w.offset+w.bytes),rate:w.sampleRate,durationMs:w.durationMs};});
cases.push({id:'digital-silence',script:'',term:'',voice:null,origin:'digital zero PCM',rate:16000,pcm:Buffer.alloc(16000*2*5),durationMs:5000,referenceValidated:true});
const sources=['backend/muse-stream.mjs','backend/stream-audio.mjs','backend/speech-turns.mjs','backend/lab-core.mjs','backend/format-pipeline.mjs','backend/number-format.mjs','backend/term-format.mjs','backend/dictation-commands.mjs','backend/spoken-colon.mjs','data/vocabulario/formas-dictadas.v1.json'];
const build=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
for(const f of sources)if(hash(execFileSync('git',['show',build+':'+f]))!==hash(Buffer.from(fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'))))throw Error('Dirty application source '+f);
write('protocol.json',{schema:'dictation-adjustments-v1',createdAt:new Date().toISOString(),build,sourceHashes:Object.fromEntries(sources.map(f=>[f,hash(fs.readFileSync(f))])),scriptHash:hash(fs.readFileSync(new URL(import.meta.url))),manifestHash:hash(fs.readFileSync(path.join(dir,'manifest.json'))),hypothesis:'Frozen balanced vocabulary improves known synthetic term failures without degrading correct controls; development experiment, not independent validation.',acceptance:['50 terminal results; candidate improves paired term errors without regressing content or empty silence','No automatic terminology substitutions or production changes','Human listening required before fidelity claims'],variants,model:'muse-voice-transcribe-1.0',segmentation:'manual',languageBias:['Spanish'],repetitions:1,order:'alternate variant order per case; sequential, same PCM for both variants',metrics:{termSequence:'accent-insensitive whole-word occurrence sequence; omissions and added terms count as mismatches',protectedWords:'sequence of no/sin/derecho/izquierdo against script',wer:'descriptive literal ASR alignment, spoken punctuation may differ',endToFinalMs:'receipt of end to provider final; includes queued audio',endStreamToFinalMs:'provider endStream to final'},conditions:{audioSource:manifest.source,voices:[...new Set(manifest.cases.map(c=>c.voice))],browser:null,device:null,network:null,node:process.version,clockResolutionMs:null,instrumentationOverheadMs:null,referenceValidated:false,postprocessing:true,review:false},cases:cases.map(({pcm,...c})=>({...c,pcmHash:hash(pcm)}))});
console.log('Protocol: '+out);
const key=loadMetaKey('.env.local');if(!key)throw Error('Missing key');
const results=[],finished=new Map();let count=0;
const server=http.createServer();const closeStream=attachMuseStream(server,{getKey:()=>key,getConfig:id=>{const v=variants.find(v=>v.id===id);return v?{...v,engine:'muse',model:'muse-voice-transcribe-1.0'}:null;},start:()=>({id:String(++count)}),finish:(run,result)=>{const {original,derived,...safe}=result;finished.set(run.id,safe);return result;}});
server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
const norm=s=>(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const vocabulary=new Set(manifest.cases.flatMap(c=>c.terms).map(norm).filter(w=>w!=='coma'));
const terms=s=>(norm(s).match(/[a-z]+/g)??[]).filter(w=>vocabulary.has(w));
const protectedWords=s=>norm(s).match(/\b(?:no|sin|ni|derech[oa]s?|izquierd[oa]s?|bilateral)\b/g)??[];
try{
 for(let rep=1;rep<=1;rep++)for(let i=0;i<cases.length;i++)for(const v of ((i+rep)%2?variants:[...variants].reverse())){
  const c=cases[i];let id=null;const ws=new WebSocket(origin.replace('http:','ws:')+'/asr-stream',{origin});const closed=once(ws,'close');ws.on('message',b=>{const m=JSON.parse(b);if(m.type==='started')id=m.runId;});
  await once(ws,'open');ws.send(JSON.stringify({type:'start',configId:v.id,rate:c.rate,segmentation:'manual'}));
  const chunk=c.rate*2*.08;for(let p=0;p<c.pcm.length&&ws.readyState===WebSocket.OPEN;p+=chunk){ws.send(c.pcm.subarray(p,p+chunk));await new Promise(r=>setTimeout(r,80));}
  if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'end',pcmHash:hash(c.pcm)}));await closed;
  const r=finished.get(id)??{status:'missing',text:null};
  const processed={text:r.text??'',numbersEnabled:true,termsEnabled:true,commandsEnabled:true,timings:{}};applyFormatting(processed);
  const formatted=processed.formatting.text; const expected=c.expectedFormatted??'';
  const canonical=s=>s.trim().toLowerCase().replace(/[ \t]+/g,' ');
  const quantities=s=>norm(s).match(/\d+(?:[.,]\d+)?|\b(?:milimetros?|centimetros?|mm|cm|mililitros?|ml)\b/g)??[];
  const row={category:c.category??'silence',voice:c.voice,formatted,expectedFormatted:expected,formatStages:{numbers:processed.numberFormatting,terms:processed.termFormatting,commands:processed.formatting},exactMatch:r.status==='completed'&&canonical(expected)===canonical(formatted),quantityMatch:r.status==='completed'&&JSON.stringify(quantities(expected))===JSON.stringify(quantities(formatted)),formattedTermMatch:r.status==='completed'&&JSON.stringify(terms(c.script))===JSON.stringify(terms(formatted)),formattedProtectedMatch:r.status==='completed'&&JSON.stringify(protectedWords(c.script))===JSON.stringify(protectedWords(formatted)),caseId:c.id,rep,variant:v.id,script:c.script,audioHash:hash(c.pcm),...r,termSequenceExpected:terms(c.script),termSequenceObserved:terms(r.text),termMatch:r.status==='completed'&&JSON.stringify(terms(c.script))===JSON.stringify(terms(r.text)),protectedMatch:r.status==='completed'&&JSON.stringify(protectedWords(c.script))===JSON.stringify(protectedWords(r.text)),score:r.status==='completed'?score(c.script,r.text):null};
  results.push(row);write('results.json',results);console.log(JSON.stringify({case:c.id,rep,variant:v.id,status:r.status,text:r.text,formatted,exactMatch:row.exactMatch,termMatch:row.termMatch,quantityMatch:row.quantityMatch}));
 }
 write('completion.json',{completedAt:new Date().toISOString(),runs:results.length,completed:results.filter(r=>r.status==='completed').length});
}catch(e){write('failure.json',{error:e.message,completedRows:results.length});throw e;}finally{closeStream();await new Promise(r=>server.close(r));}
