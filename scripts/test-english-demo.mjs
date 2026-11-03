// Opt-in live smoke test. Requires an explicit synthetic TTS manifest; never reads a microphone.
// Evidence (including synthetic transcript) stays in ignored data/local. No secrets are logged.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {WebSocket} from 'ws';
import {createDemo} from '../backend/demo.mjs';
import {loadMetaKey} from '../backend/meta-key.mjs';
import {hash,wavInfo} from '../backend/lab-core.mjs';
const manifestPath=process.argv[2];
if(!manifestPath)throw Error('Pass a local synthetic TTS manifest path.');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8').replace(/^\uFEFF/,''));
if(manifest.source!=='Windows System.Speech local TTS; no human or clinical audio'||manifest.marker!=='pineapple')throw Error('Expected the declared English synthetic fixture.');
const wav=fs.readFileSync(path.resolve(path.dirname(manifestPath),manifest.file)),info=wavInfo(wav);
if(info.channels!==1||info.bits!==16||info.sampleRate!==48000)throw Error('Expected 48 kHz mono PCM16.');
const pcm=wav.subarray(info.offset,info.offset+info.bytes),output='data/local/english-smoke-'+Date.now();fs.mkdirSync(output,{recursive:true});
const files=['backend/demo.mjs','backend/muse-stream.mjs','backend/english-format.mjs','backend/format-pipeline.mjs','backend/meta-review.mjs','backend/review-context.mjs'];
const protocol={schema:'dicta-english-smoke-v1',createdAt:new Date().toISOString(),checkout:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),sourceHash:hash(Buffer.concat(files.map(f=>fs.readFileSync(f)))),node:process.version,platform:process.platform,device:null,browser:null,network:'loopback plus Meta WSS/HTTPS; physical connection unknown',audioSource:manifest.source,voice:manifest.voice,culture:manifest.culture,repetitions:1,durationMs:pcm.length/96,pcmHash:hash(pcm),config:'demo-muse-en/manual',hypothesis:'English transcription completes and retains the synthetic marker. English review flags explicit laterality contradiction with exact quotes.',acceptance:'completed stream with verified integrity and pineapple in final text; completed review with contradiction, literal evidence and English reason checked manually',clockPrecisionMs:null,instrumentationOverheadMs:null};
fs.writeFileSync(output+'/protocol.json',JSON.stringify(protocol,null,2));
const portServer=net.createServer();portServer.listen(0,'127.0.0.1');await once(portServer,'listening');const port=portServer.address().port;await new Promise(r=>portServer.close(r));
const origin='http://127.0.0.1:'+port,demo=createDemo({accessCode:'synthetic-fixture',publicOrigin:origin,metaKey:loadMetaKey('.env.local'),build:null});demo.server.listen(port,'127.0.0.1');await once(demo.server,'listening');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
 const login=await fetch(origin+'/demo/access',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'code=synthetic-fixture'}),cookie=login.headers.get('set-cookie').split(';')[0];
 const api=async(url,body)=>{const r=await fetch(origin+url,{headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('HTTP '+r.status);return r.json();};
 ws=new WebSocket(origin.replace('http:','ws:')+'/asr-stream',{origin,headers:{Cookie:cookie}});const messages=[];ws.on('message',b=>messages.push(JSON.parse(b)));await once(ws,'open');const closed=once(ws,'close');
 ws.send(JSON.stringify({type:'start',rate:48000,configId:'demo-muse-en',commandsEnabled:true,numbersEnabled:true,termsEnabled:true}));
 const readyUntil=Date.now()+20000;while(!messages.some(m=>m.type==='ready')){if(Date.now()>readyUntil||ws.readyState!==WebSocket.OPEN)throw Error('Provider did not become ready');await sleep(10);}
 const started=performance.now();for(let offset=0;offset<pcm.length;offset+=9600){if(ws.readyState!==WebSocket.OPEN)throw Error('Stream closed while sending');ws.send(pcm.subarray(offset,offset+9600));await sleep(Math.max(0,(offset+9600)/96-(performance.now()-started)));}
 ws.send(JSON.stringify({type:'end',pcmHash:hash(pcm)}));await closed;
 const state=await api('/api/state'),run=state.runs.at(-1);fs.writeFileSync(output+'/run.json',JSON.stringify(run,null,2));
 const report='FINDINGS\nA solitary nodule is present in the right upper lobe.\nIMPRESSION\nThe same solitary nodule is in the left upper lobe.';
 let review=await api('/api/report-reviews',{text:report,language:'en'});const reviewUntil=Date.now()+100000;while(['queued','running'].includes(review.status)){if(Date.now()>reviewUntil)throw Error('Review polling timeout');await sleep(1000);review=await api('/api/report-reviews/'+review.id);}fs.writeFileSync(output+'/review.json',JSON.stringify(review,null,2));
 const result={status:run.status,language:run.configuration.language,integrityVerified:run.stream.integrityVerified,markerRecognized:/\bpineapple\b/i.test(run.text??''),endToFinalMs:run.stream.endToFinalMs,reviewStatus:review.status,contradictions:review.suggestions.filter(s=>s.kind==='contradiction').length,reviewLanguage:review.input.language,reasonLanguageManualCheck:null,output};fs.writeFileSync(output+'/summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 if(result.status!=='completed'||!result.integrityVerified||!result.markerRecognized||result.reviewStatus!=='completed'||!result.contradictions)process.exitCode=1;
}catch(error){fs.writeFileSync(output+'/failure.json',JSON.stringify({message:error.message}));throw error;}finally{ws?.terminate();await demo.close();}
