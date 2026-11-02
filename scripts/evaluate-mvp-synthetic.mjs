// Explicit real Meta evaluation: only the fixed local synthetic MVP corpus.
// Private templates, human audio and credentials are never copied to results.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {hash,wavInfo,score} from '../backend/lab-core.mjs';
import {loadMetaKey} from '../backend/meta-key.mjs';

const source=path.resolve(process.argv[2]??'.runtime/mvp-eval-source');
const build=process.argv[3];if(!/^[a-f0-9]{40}$/.test(build??''))throw Error('Specify the exact archived commit.');
const corpus=path.resolve('data/local/mvp-synthetic-v1');
const manifestBytes=fs.readFileSync(path.join(corpus,'manifest.json'));
const manifest=JSON.parse(manifestBytes.toString('utf8').replace(/^\uFEFF/,''));
if(manifest.source!=='System.Speech local synthetic TTS'||manifest.cases.length!==15)throw Error('Unexpected corpus.');
const files=['backend/demo.mjs','backend/muse-stream.mjs','backend/format-pipeline.mjs','backend/number-format.mjs','backend/term-format.mjs','backend/dictation-commands.mjs','backend/meta-review.mjs','backend/review-context.mjs'];
for(const f of files){const expected=execFileSync('git',['show',build+':'+f]);if(hash(expected)!==hash(fs.readFileSync(path.join(source,f))))throw Error('Archived source mismatch: '+f);}
const sourceHashes=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(source,f)))]));
const output=path.resolve('data/local/lab/reports/mvp-evaluation-'+Date.now());fs.mkdirSync(output,{recursive:true});
const write=(name,data)=>fs.writeFileSync(path.join(output,name),JSON.stringify(data,null,2));
const protocol={schema:'mvp-synthetic-evaluation-v1',createdAt:new Date().toISOString(),build,sourceHashes,evaluatorScriptHash:hash(fs.readFileSync(new URL(import.meta.url))),manifestHash:hash(manifestBytes),
 hypothesis:'Streaming manual preserves spoken findings, polarity, laterality, quantity/unit and commands; global review flags textual inconsistencies without editing the source.',
 acceptance:['15 terminal ASR outcomes, retain all failures','no added/omitted/changed protected clinical content against provisional TTS scripts','dictation commands yield intended line/paragraph structure','review outcomes retained, evidence anchored, original immutable; false positives assessed separately'],
 configuration:{model:'muse-voice-transcribe-1.0',mode:'streaming',segmentation:'manual',keywords:[],commandsEnabled:true,numbersEnabled:true,termsEnabled:true,reviewModel:'muse-spark-1.3'},
 metrics:{rawWer:'literal alignment against spoken TTS script, descriptive only; punctuation/numerals can differ',formattedWer:'alignment against proposed formatted text, unit abbreviations can differ',endToFinalMs:'server receipt of end -> final provider transcript; includes buffered replay',endStreamToFinalMs:'upstream endStream send -> final provider transcript',reviewRequestMs:'provider request -> complete response/error'},
 conditions:{repetitions:1,os:os.platform(),osRelease:os.release(),node:process.version,browser:null,phone:null,network:null,audioSource:manifest.source,voices:[...new Set(manifest.cases.map(c=>c.voice))],referenceValidated:false,referenceOrigin:'TTS input script, no human listening validation',replay:'PCM16 frames, 80ms paced over loopback; provider adapter paces its own upload',clockResolutionMs:null,instrumentationOverheadMs:null},cases:manifest.cases};
write('protocol.json',protocol);console.log('Protocol: '+output);
const {createDemo}=await import(pathToFileURL(path.join(source,'backend/demo.mjs')));
const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;probe.close();await once(probe,'close');
const origin='http://127.0.0.1:'+port;
const demo=createDemo({accessCode:'isolated-synthetic-evaluation',metaKey:loadMetaKey('.env.local'),publicOrigin:origin,build});
demo.server.listen(port,'127.0.0.1');await once(demo.server,'listening');
const results=[];
try{
 const login=await fetch(origin+'/demo/access',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:'isolated-synthetic-evaluation'})});
 const cookie=login.headers.get('set-cookie')?.split(';')[0];if(!cookie)throw Error('Local login failed.');
 const api=async(p,data)=>{const r=await fetch(origin+p,{method:data===undefined?'GET':'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw Error(j.error??'HTTP '+r.status);return j;};
 for(const c of manifest.cases){
  const file=path.resolve(corpus,c.file);if(path.dirname(file)!==corpus)throw Error('Invalid corpus path.');
  const bytes=fs.readFileSync(file);if(hash(bytes)!==c.sha256)throw Error('Audio hash mismatch.');
  const info=wavInfo(bytes);if(info.channels!==1)throw Error('Mono required.');const pcm=bytes.subarray(info.offset,info.offset+info.bytes);
  const messages=[];let runId=null;
  const ws=new WebSocket(origin.replace('http:','ws:')+'/asr-stream',{origin,headers:{Cookie:cookie}});
  const closed=once(ws,'close');ws.on('message',b=>{const m=JSON.parse(b);if(m.type==='started')runId=m.runId;if(m.type!=='partial')messages.push(m);});
  await once(ws,'open');ws.send(JSON.stringify({type:'start',rate:info.sampleRate,configId:'demo-muse',segmentation:'manual',commandsEnabled:true,numbersEnabled:true,termsEnabled:true}));
  const chunk=info.sampleRate*2*.08;
  for(let p=0;p<pcm.length&&ws.readyState===WebSocket.OPEN;p+=chunk){ws.send(pcm.subarray(p,Math.min(p+chunk,pcm.length)));await new Promise(r=>setTimeout(r,80));}
  if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'end',pcmHash:hash(pcm)}));
  await closed;
  const run=(await api('/api/state')).runs.find(r=>r.id===runId)??null;
  const formatted=run?.formatting?.text??run?.termFormatting?.text??run?.numberFormatting?.text??run?.text??null;
  const row={caseId:c.id,baseId:c.baseId,voice:c.voice,audioHash:c.sha256,durationMs:info.durationMs,referenceValidated:false,script:c.script,expectedFormatted:c.expectedFormatted,run,formatted,messages,rawScore:run?.status==='completed'?score(c.script,run.text):null,formattedScore:run?.status==='completed'?score(c.expectedFormatted,formatted):null,review:null};
  results.push(row);write('results.json',results);console.log(JSON.stringify({caseId:c.id,status:run?.status??'failed',formatted,endToFinalMs:run?.stream?.endToFinalMs??null,error:run?.error??null}));
 }
 for(const row of results.filter(r=>r.run?.status==='completed')){
  let review=await api('/api/report-reviews',{text:row.formatted});
  while(['queued','running'].includes(review.status)){await new Promise(r=>setTimeout(r,500));review=await api('/api/report-reviews/'+review.id);}
  row.review=review;row.originalPreserved=(await api('/api/state')).runs.find(r=>r.id===row.run.id)?.text===row.run.text;write('results.json',results);
  console.log(JSON.stringify({reviewCase:row.caseId,status:review.status,notices:review.suggestions.length,originalPreserved:row.originalPreserved}));
 }
 write('completion.json',{completedAt:new Date().toISOString(),cases:results.length,completed:results.filter(r=>r.run?.status==='completed').length,reviewCompleted:results.filter(r=>r.review?.status==='completed').length,referenceValidated:false});
}catch(e){write('failure.json',{error:e.message,completedCases:results.length});throw e;}finally{await demo.close();}
