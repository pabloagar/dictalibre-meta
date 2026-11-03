// Ten independent desktop/phone pairs. Synthetic audio only; never reads a microphone.
// mock: local provider; local-meta: real Meta with .env.local; remote: deployed demo.
// Secrets are read from the environment or DEMO_TEST_ENV_FILE, never written to evidence.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {parseEnv} from 'node:util';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket,WebSocketServer} from 'ws';
import {createDemo} from '../backend/demo.mjs';
import {loadMetaKey} from '../backend/meta-key.mjs';
import {hash,wavInfo} from '../backend/lab-core.mjs';
import {StreamResampler} from '../backend/stream-audio.mjs';
import {encodeChunk,decodeChunk} from '../apps/shared/protocol.js';

const args=Object.fromEntries(process.argv.slice(2).map(v=>{const i=v.indexOf('=');return [v.slice(2,i),v.slice(i+1)];}));
const mode=args.mode??'mock',repetitions=Number(args.repetitions??1),count=10;
if(!['mock','local-meta','remote'].includes(mode)||![1,2,3].includes(repetitions))throw Error('Use --mode=mock|local-meta|remote --repetitions=1|2|3');
const output=args.output??'data/local/concurrency-'+Date.now();
if(fs.existsSync(output))throw Error('Output must be a new directory; previous evidence is preserved.');
fs.mkdirSync(output,{recursive:true});
const words=['manzana','banana','cereza','durazno','frutilla','limón','naranja','pera','sandía','uva'];
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fixtures=args.manifest?JSON.parse(fs.readFileSync(args.manifest,'utf8').replace(/^\uFEFF/,'')).cases.map(c=>{
 const wav=fs.readFileSync(path.resolve(path.dirname(args.manifest),c.file)),info=wavInfo(wav);
 if(info.channels!==1||info.bits!==16)throw Error('PCM16 mono fixtures required');
 return {pcm:wav.subarray(info.offset,info.offset+info.bytes),rate:info.sampleRate,word:c.word,source:c.source};
}):words.map((word,i)=>{const rate=48000,pcm=Buffer.alloc(rate*2*2);for(let n=0;n<rate*2;n++)pcm.writeInt16LE(Math.round(5000*Math.sin(2*Math.PI*(220+i*37)*n/rate)),n*2);return {word,rate,pcm,source:'synthetic sine; not speech'};});
if(fixtures.length!==10||new Set(fixtures.map(f=>f.word)).size!==10)throw Error('Exactly ten distinct synthetic fixtures required');
if(mode!=='mock'&&!args.manifest)throw Error('Real Meta requires an explicit synthetic speech manifest');
const protocol={schema:'dicta-concurrency-v1',mode,count,repetitions,createdAt:new Date().toISOString(),checkout:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),sourceHash:hash(Buffer.concat(['backend/demo.mjs','backend/muse-stream.mjs','backend/server.mjs'].map(f=>fs.readFileSync(f)))),driverHash:hash(fs.readFileSync(new URL(import.meta.url))),node:process.version,os:os.platform(),arch:os.arch(),hardware:null,browser:null,physicalPhones:0,network:mode==='remote'?'single driver to Render over HTTPS/WSS; local connection type unknown':mode==='local-meta'?'loopback plus Meta WSS; local connection type unknown':'loopback',clock:'performance.now milliseconds',clockPrecisionMs:null,instrumentationOverheadMs:null,config:'demo-muse/manual',hypothesis:'Ten overlapping streams complete without mixing sessions; relay audio hashes and per-visitor run ownership remain exact.',acceptance:'10 simultaneous active streams; all completed with verified hashes; unique expected marker per session; no foreign runs or cancellation permission; no residual active streams.',fixtures:fixtures.map(f=>({rate:f.rate,durationMs:f.pcm.length/f.rate/2*1000,pcmHash:hash(f.pcm),source:f.source,marker:f.word}))};
fs.writeFileSync(path.join(output,'protocol.json'),JSON.stringify(protocol,null,2));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clients=[],rows=[];let demo,provider,origin=args.origin,accessCode,providerActive=0,providerPeak=0;
async function connect(url,cookie){
 const ws=new WebSocket(url,{origin,headers:cookie?{Cookie:cookie}:{},handshakeTimeout:15000});clients.push(ws);
 const messages=[];ws.on('message',(b,binary)=>{if(!binary)messages.push(JSON.parse(b));});ws.on('error',()=>{});
 const wait=async predicate=>{const until=performance.now()+65000;while(performance.now()<until){const found=messages.find(predicate);if(found)return found;if(ws.readyState===WebSocket.CLOSED)throw Error('Socket closed before expected message');await sleep(10);}throw Error('Message timeout');};
 await once(ws,'open');return {ws,messages,wait,send:m=>ws.send(JSON.stringify(m))};
}
async function state(cookie){const r=await fetch(origin+'/api/state',{headers:{Cookie:cookie},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('State HTTP '+r.status);return r.json();}
try{
 if(mode==='mock'){
  const expected=new Map(fixtures.map(f=>{const sampler=new StreamResampler(f.rate);return [hash(sampler.push(f.pcm,true)),f.word];}));
  provider=new WebSocketServer({port:0,host:'127.0.0.1'});await once(provider,'listening');
  provider.on('connection',ws=>{providerActive++;providerPeak=Math.max(providerPeak,providerActive);const parts=[];let started=false;ws.on('close',()=>providerActive--);ws.on('message',(b,binary)=>{if(binary){parts.push(Buffer.from(b));return;}const m=JSON.parse(b);if(!started){started=true;ws.send(JSON.stringify({sessionId:'synthetic'}));}else if(m.type==='endStream'){const word=expected.get(hash(Buffer.concat(parts)));ws.send(JSON.stringify({type:'transcript',transcript:word?'Prueba '+word:'AUDIO NO COINCIDE',final:true}));}});});
 }
 if(mode==='remote'){
  if(!origin||new URL(origin).protocol!=='https:')throw Error('Remote origin must be explicit HTTPS');
  const env=process.env.DEMO_TEST_ENV_FILE?parseEnv(fs.readFileSync(process.env.DEMO_TEST_ENV_FILE,'utf8').replace(/^\uFEFF/,'')):{};
  accessCode=env.DEMO_ACCESS_CODE??process.env.DEMO_ACCESS_CODE;if(!accessCode)throw Error('Missing DEMO_ACCESS_CODE');
 }else{
  origin='http://127.0.0.1:8899';accessCode='local-concurrency-fixture';
  demo=createDemo({accessCode,publicOrigin:origin,metaKey:mode==='mock'?'synthetic-key':loadMetaKey('.env.local'),museEndpoint:provider?'ws://127.0.0.1:'+provider.address().port:undefined,build:protocol.dirty?null:protocol.checkout});
  demo.server.listen(8899,'127.0.0.1');await once(demo.server,'listening');
 }
 const pairs=[];
 for(let i=0;i<count;i++){
  const response=await fetch(origin+'/demo/access',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:accessCode}),signal:AbortSignal.timeout(15000)});
  if(response.status!==303)throw Error('Login HTTP '+response.status);
  const cookie=response.headers.get('set-cookie').split(';')[0];
  if(i===0){const current=await state(cookie);if(current.concurrency?.limit!==10||current.concurrency.active!==0)throw Error('Need deployed limit 10 and no active dictation');protocol.activeBuild=current.build;fs.writeFileSync(path.join(output,'protocol.json'),JSON.stringify(protocol,null,2));}
  const pc=await connect(origin.replace(/^http/,'ws')+'/ws',cookie);pc.send({type:'create'});
  const created=await pc.wait(m=>m.type==='created'||m.type==='error');if(created.type==='error')throw Error(created.message);
  const phone=await connect(origin.replace(/^http/,'ws')+'/ws');phone.send({type:'join_qr',token:created.token});await phone.wait(m=>m.type==='paired');await pc.wait(m=>m.type==='paired');
  pairs.push({cookie,pc,phone});
 }
 for(let repetition=0;repetition<repetitions;repetition++){
  const takes=await Promise.all(pairs.map(async(p,i)=>{
   const asr=await connect(origin.replace(/^http/,'ws')+'/asr-stream',p.cookie),f=fixtures[i],parts=[];
   const startedAt=performance.now();asr.send({type:'start',rate:f.rate,configId:'demo-muse',segmentation:'manual',commandsEnabled:true,numbersEnabled:true,termsEnabled:true});
   const ready=await asr.wait(m=>m.type==='ready'||m.type==='error'||m.type==='done');
   if(ready.type!=='ready')throw Error('ASR start failed: '+(ready.message??ready.status));
   const take={asr,p,f,parts,startedAt,readyAt:performance.now(),endAt:null,doneAt:null};
   take.listener=(bytes,binary)=>{if(binary){const frame=decodeChunk(bytes);const pcm=Buffer.from(frame.pcm);parts.push(pcm);asr.ws.send(pcm);}else{const m=JSON.parse(bytes);if(m.type==='end'&&m.id===repetition+1){take.relayHashMatches=hash(Buffer.concat(parts))===hash(f.pcm)&&m.hash===hash(f.pcm);asr.send({type:'end',pcmHash:hash(Buffer.concat(parts))});p.pc.send({type:'verified',id:m.id,hash:m.hash});}}};
   p.pc.ws.on('message',take.listener);asr.ws.on('message',b=>{const m=JSON.parse(b);if(m.type==='done')take.doneAt=performance.now();});return take;
  }));
  const concurrent=await state(pairs[0].cookie);const overlap=concurrent.concurrency.active;
  await Promise.all(takes.map(async(t,i)=>{
   const {f,p}=t;const samples=f.pcm.length/2,block=Math.floor(f.rate/10);let sequence=0;
   p.phone.send({type:'start',id:repetition+1,rate:f.rate,source:'tone',mode:'hold'});const started=performance.now();
   for(let offset=0;offset<samples;offset+=block){const n=Math.min(block,samples-offset);p.phone.ws.send(encodeChunk(repetition+1,sequence++,Int16Array.from({length:n},(_,j)=>f.pcm.readInt16LE((offset+j)*2))));await sleep(Math.max(0,started+(offset+n)/f.rate*1000-performance.now()));}
   t.endAt=performance.now();p.phone.send({type:'end',id:repetition+1,frames:sequence,samples,hash:hash(f.pcm)});
   const done=await t.asr.wait(m=>m.type==='done'||m.type==='error');const own=await state(p.cookie),run=own.runs.find(r=>r.id===done.runId);
   const text=normalize(run?.text??''),tokens=text.match(/[a-z]+/g)??[];
   const expectedMarker=tokens.includes(normalize(f.word)),foreignMarker=fixtures.some((other,j)=>j!==i&&tokens.includes(normalize(other.word)));
   const neighbor=pairs[(i+1)%count];
   const forbidden=done.runId?await fetch(origin+'/api/cancel',{method:'POST',headers:{Origin:origin,Cookie:neighbor.cookie,'Content-Type':'application/json'},body:JSON.stringify({id:done.runId}),signal:AbortSignal.timeout(15000)}):null;
   const row={repetition:repetition+1,session:i+1,simultaneouslyActive:overlap,completed:done.status==='completed',error:run?.error??done.message??null,syntheticTranscript:run?.text??null,relayHashMatches:t.relayHashMatches??false,asrIntegrity:run?.stream?.integrityVerified??false,expectedMarker,foreignMarker,ownRunCount:own.runs.length,foreignCancellationStatus:forbidden?.status??null,handshakeMs:t.readyAt-t.startedAt,stopToDoneMs:t.doneAt===null?null:t.doneAt-t.endAt,providerEndToFinalMs:run?.stream?.endToFinalMs??null,build:own.build};
   row.passed=row.simultaneouslyActive===10&&row.completed&&row.relayHashMatches&&row.asrIntegrity&&expectedMarker&&!foreignMarker&&row.ownRunCount===repetition+1&&row.foreignCancellationStatus===404;
   rows.push(row);p.pc.ws.off('message',t.listener);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(rows,null,2));
  }));
  const final=await state(pairs[0].cookie);if(final.concurrency.active!==0)throw Error('Stream slots not released');
 }
 const final=await state(pairs[0].cookie);
 const summary={mode,count,repetitions,attempted:rows.length,passed:rows.filter(r=>r.passed).length,allPassed:rows.length===count*repetitions&&rows.every(r=>r.passed),maxSimultaneous:Math.max(...rows.map(r=>r.simultaneouslyActive)),providerPeak:mode==='mock'?providerPeak:null,activeAfter:final.concurrency.active,build:final.build,cost:null,physicalPeople:0};
 fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));console.log('Evidence: '+output);if(!summary.allPassed)process.exitCode=1;
}catch(error){fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:error.message,completedRows:rows.length},null,2));console.error(error.message);console.log('Evidence: '+output);process.exitCode=1;}
finally{for(const ws of clients)ws.terminate();if(demo)await demo.close();if(provider){for(const ws of provider.clients)ws.terminate();await new Promise(resolve=>provider.close(resolve));}}
