// Reproducible real-provider smoke. Uses an existing synthetic lab audio by ID.
import fs from 'node:fs';
import {WebSocket} from 'ws';
import {hash,wavInfo} from '../backend/lab-core.mjs';
const base='http://127.0.0.1:8789',audioId=process.argv[2];
if(!audioId)throw Error('Indica el ID de un audio sintético del laboratorio.');
const state=await(await fetch(base+'/api/state')).json();
if(state.runs.some(r=>['queued','running'].includes(r.status)))throw Error('Hay ejecuciones activas.');
const wav=Buffer.from(await(await fetch(base+'/api/audio/'+audioId)).arrayBuffer()),info=wavInfo(wav),original=wav.subarray(info.offset,info.offset+info.bytes);
// Two copies separated by 3 seconds of PCM silence, explicitly labelled derivative.
const pcm=Buffer.concat([original,Buffer.alloc(info.sampleRate*2*3),original,Buffer.alloc(info.sampleRate*2*3)]);
const dir=`data/local/lab/reports/endpointing-${Date.now()}`;fs.mkdirSync(dir,{recursive:true});
const config=state.configs.find(c=>c.engine==='muse'&&!c.keywords.length);
const protocol={hypothesis:'Dos intervenciones pueden consolidarse sin parar el micrófono y conservarse hasta cierre íntegro.',acceptance:'Resultado completed, integridad verificada, al menos dos segmentos; sin afirmar precisión clínica.',sourceAudioId:audioId,originalWavHash:hash(wav),pcmHash:hash(pcm),sourceHash:state.sourceHash,build:state.build,config,repeats:1,segmentation:'automatic',source:'replay sintético PC; dos copias y dos silencios de 3 s',network:null,phone:null,timing:'atMs: reloj monotónico desde apertura WS local; fin→done separado de speechEnd→speechComplete en servidor; no mide pantalla ni fin acústico real.'};
fs.writeFileSync(dir+'/protocol.json',JSON.stringify(protocol,null,2));
let runId,offset=0,start,endAt,timer;const events=[];
await new Promise((resolve,reject)=>{
 const ws=new WebSocket(base.replace('http:','ws:')+'/asr-stream',{origin:base});
 const timeout=setTimeout(()=>{ws.terminate();reject(Error('Timeout de smoke'));},pcm.length/info.sampleRate/2*1000+45000);
 function next(){const end=Math.min(offset+Math.round(info.sampleRate*.08)*2,pcm.length);timer=setTimeout(()=>{if(ws.readyState!==WebSocket.OPEN)return;ws.send(pcm.subarray(offset,end));offset=end;if(offset===pcm.length){endAt=performance.now();ws.send(JSON.stringify({type:'end',pcmHash:hash(pcm)}));}else next();},Math.max(0,end/info.sampleRate/2*1000-(performance.now()-start)));}
 ws.on('open',()=>{start=performance.now();ws.send(JSON.stringify({type:'start',rate:info.sampleRate,configId:config.id,segmentation:'automatic',commandsEnabled:true}));next();});
 ws.on('message',b=>{const m=JSON.parse(b);if(m.type==='started')runId=m.runId;events.push({...m,atMs:performance.now()-start,endToDoneMs:m.type==='done'&&endAt?performance.now()-endAt:null});});
 ws.on('error',reject);ws.on('close',()=>{clearTimeout(timeout);clearTimeout(timer);resolve();});
});
const after=await(await fetch(base+'/api/state')).json(),run=after.runs.find(r=>r.id===runId);
fs.writeFileSync(dir+'/result.json',JSON.stringify({protocol,run,events},null,2));
console.log(JSON.stringify({dir,runId,status:run?.status,segments:run?.stream?.segmentCount,integrity:run?.stream?.integrityVerified,endToFinalMs:run?.stream?.endToFinalMs}));
if(run?.status!=='completed'||!run.stream.integrityVerified||run.stream.segmentCount<2)process.exitCode=1;
