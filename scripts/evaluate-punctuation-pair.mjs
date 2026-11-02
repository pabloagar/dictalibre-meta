import {MVP_KEYWORDS} from '../backend/mvp-glossary.mjs';
// Isolated real ASR experiment. No text correction, Spark, template or production changes.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {WebSocket} from 'ws';
import {attachMuseStream} from '../backend/muse-stream.mjs';
import {loadMetaKey} from '../backend/meta-key.mjs';
import {hash,wavInfo,score} from '../backend/lab-core.mjs';
const dir=path.resolve(process.argv[2]??'data/local/punctuation-pair-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8').replace(/^\uFEFF/,''));
if(manifest.schema!=='term-pair-corpus-v1'||manifest.cases.length!==7)throw Error('Unexpected corpus');
const out=path.resolve('data/local/lab/reports/punctuation-pair-'+Date.now());fs.mkdirSync(out,{recursive:true});
const write=(f,v)=>fs.writeFileSync(path.join(out,f),JSON.stringify(v,null,2));
const variants=[{id:'baseline',keywords:[...MVP_KEYWORDS]},{id:'balanced',keywords:[...MVP_KEYWORDS,'punto','coma','dos puntos','nueva línea','nuevo párrafo','punto y coma']}];
const cases=manifest.cases.map(c=>{const file=path.resolve(dir,c.file);if(path.dirname(file)!==dir)throw Error('Invalid file');const b=fs.readFileSync(file);if(hash(b)!==c.sha256)throw Error('Hash mismatch');const w=wavInfo(b);return {...c,pcm:b.subarray(w.offset,w.offset+w.bytes),rate:w.sampleRate,durationMs:w.durationMs};});
cases.push({id:'digital-silence',script:'',term:'',voice:null,origin:'digital zero PCM',rate:16000,pcm:Buffer.alloc(16000*2*5),durationMs:5000,referenceValidated:true});
const sources=['backend/muse-stream.mjs','backend/stream-audio.mjs','backend/speech-turns.mjs','backend/lab-core.mjs'];
const build=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
for(const f of sources)if(hash(execFileSync('git',['show',build+':'+f]))!==hash(Buffer.from(fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'))))throw Error('Dirty application source '+f);
write('protocol.json',{schema:'term-pair-evaluation-v1',createdAt:new Date().toISOString(),build,sourceHashes:Object.fromEntries(sources.map(f=>[f,hash(fs.readFileSync(f))])),scriptHash:hash(fs.readFileSync(new URL(import.meta.url))),manifestHash:hash(fs.readFileSync(path.join(dir,'manifest.json'))),hypothesis:'Exploratory command keyword hints preserve spoken command words versus MVP vocabulary; reject if unspoken punctuation or commands remain or content changes.',acceptance:['Fewer term-sequence errors than baseline across paired runs','No new wrong-term or polarity/laterality errors on a case baseline got right','No target terms in neutral/silence controls; silence has no words','No adoption until human-listened references and unseen human-voice controls pass'],variants,model:'muse-voice-transcribe-1.0',segmentation:'manual',languageBias:['Spanish'],repetitions:2,order:'alternate baseline/balanced by case and repetition',metrics:{termSequence:'accent-insensitive whole-word occurrence sequence; omissions and added terms count as mismatches',protectedWords:'sequence of no/sin/derecho/izquierdo against script',wer:'descriptive literal ASR alignment, spoken punctuation may differ',endToFinalMs:'receipt of end to provider final; includes queued audio',endStreamToFinalMs:'provider endStream to final'},conditions:{audioSource:manifest.source,voices:['Microsoft Laura'],browser:null,device:null,network:null,node:process.version,clockResolutionMs:null,instrumentationOverheadMs:null,referenceValidated:false,postprocessing:false,review:false},cases:cases.map(({pcm,...c})=>({...c,pcmHash:hash(pcm)}))});
console.log('Protocol: '+out);
const key=loadMetaKey('.env.local');if(!key)throw Error('Missing key');
const results=[],finished=new Map();let count=0;
const server=http.createServer();const closeStream=attachMuseStream(server,{getKey:()=>key,getConfig:id=>{const v=variants.find(v=>v.id===id);return v?{...v,engine:'muse',model:'muse-voice-transcribe-1.0'}:null;},start:()=>({id:String(++count)}),finish:(run,result)=>{const {original,derived,...safe}=result;finished.set(run.id,safe);return result;}});
server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
const norm=s=>(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const terms=s=>norm(s).match(/\b(?:neumotorax|hemotorax|hemitorax)\b/g)??[];
const protectedWords=s=>norm(s).match(/\b(?:no|sin|derecho|izquierdo)\b/g)??[];
try{
 for(let rep=1;rep<=2;rep++)for(let i=0;i<cases.length;i++)for(const v of ((i+rep)%2?variants:[...variants].reverse())){
  const c=cases[i];let id=null;const ws=new WebSocket(origin.replace('http:','ws:')+'/asr-stream',{origin});const closed=once(ws,'close');ws.on('message',b=>{const m=JSON.parse(b);if(m.type==='started')id=m.runId;});
  await once(ws,'open');ws.send(JSON.stringify({type:'start',configId:v.id,rate:c.rate,segmentation:'manual'}));
  const chunk=c.rate*2*.08;for(let p=0;p<c.pcm.length&&ws.readyState===WebSocket.OPEN;p+=chunk){ws.send(c.pcm.subarray(p,p+chunk));await new Promise(r=>setTimeout(r,80));}
  if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'end',pcmHash:hash(c.pcm)}));await closed;
  const r=finished.get(id)??{status:'missing',text:null};
  const row={caseId:c.id,rep,variant:v.id,script:c.script,audioHash:hash(c.pcm),...r,termSequenceExpected:terms(c.script),termSequenceObserved:terms(r.text),termMatch:r.status==='completed'&&JSON.stringify(terms(c.script))===JSON.stringify(terms(r.text)),protectedMatch:r.status==='completed'&&JSON.stringify(protectedWords(c.script))===JSON.stringify(protectedWords(r.text)),score:r.status==='completed'?score(c.script,r.text):null};
  results.push(row);write('results.json',results);console.log(JSON.stringify({case:c.id,rep,variant:v.id,status:r.status,text:r.text,termMatch:row.termMatch}));
 }
 write('completion.json',{completedAt:new Date().toISOString(),runs:results.length,completed:results.filter(r=>r.status==='completed').length});
}finally{closeStream();await new Promise(r=>server.close(r));}
