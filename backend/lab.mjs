import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import os from 'node:os';
import { wavInfo, hash, configuration, score, csv } from './lab-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const MODEL_REVISION='220761e60602a5ca694c409d5f424563b75d6820';
function modelReady(){
  const dir=path.join(ROOT,'models','whisper-large-v3-fp16-ov');
  try{return JSON.parse(fs.readFileSync(path.join(dir,'dicta-manifest.json'),'utf8')).revision===MODEL_REVISION&&['encoder_model','decoder_model','tokenizer','detokenizer'].every(name=>['xml','bin'].every(ext=>fs.statSync(path.join(dir,`openvino_${name}.${ext}`)).size>0));}catch{return false;}
}
export class LocalWorker {
  constructor(python=process.env.LAB_PYTHON||path.join(ROOT,'.venv','Scripts','python.exe')) { this.python=python; }
  async call(message,signal) {
    if(signal?.aborted) throw new Error('Cancelado.');
    if(!this.child) {
      this.child=spawn(this.python,['-u',path.join(ROOT,'backend','lab-worker.py')],{cwd:ROOT,windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,DO_NOT_TRACK:'1',HF_HUB_DISABLE_TELEMETRY:'1'}});
      const child=this.child;
      createInterface({input:child.stdout}).on('line',line=>{try{const m=JSON.parse(line);if(m.id===this.pending?.id) this.pending.finish(m.error?new Error(m.error):null,m.result);}catch{}});
      child.stderr.on('data',()=>{}); // Never expose a worker traceback or local paths to the UI.
      child.on('error',()=>{this.pending?.finish(new Error('No se pudo iniciar Python. Revisa el entorno del laboratorio.'));if(this.child===child)this.child=null;});
      child.on('exit',()=>{if(this.child===child){this.pending?.finish(new Error('El proceso local terminó.'));this.child=null;}});
    }
    if(this.pending) throw new Error('Worker ocupado.');
    return new Promise((resolve,reject)=>{
      const id=randomUUID(), child=this.child;
      const abort=()=>{this.pending?.finish(new Error('Cancelado o tiempo agotado.'));child.kill();if(this.child===child)this.child=null;};
      const timer=setTimeout(abort,300000);
      this.pending={id,finish:(error,result)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);this.pending=null;error?reject(error):resolve(result);}};
      signal?.addEventListener('abort',abort,{once:true});
      child.stdin.write(JSON.stringify({...message,id})+'\n');
    });
  }
  close(){this.child?.kill();}
}
export async function museTranscribe(wav,config,key,signal) {
  const form=new FormData();
  form.append('request',new Blob([JSON.stringify({model:config.model,mode:'PUSH_TO_TALK',audioEncoding:'WAV',languageBias:['Spanish'],keywords:config.keywords})],{type:'application/json'}));
  form.append('audio',new Blob([wav],{type:'audio/wav'}),'audio.wav');
  const response=await fetch('https://api.meta.ai/v1/asr/transcribe',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal});
  if(!response.ok) throw new Error(`Muse HTTP ${response.status}. Revisa acceso, cuota y configuración; no se guardó la respuesta de error.`);
  const data=await response.json();
  if(typeof data.transcript!=='string') throw new Error('Muse no devolvió transcript válido.');
  return {text:data.transcript,providerAudioDurationMs:data.audioDurationMs??null,device:'Meta API',modelRevision:null,memoryBytes:null};
}
export function createLab({dataDir=path.join(ROOT,'data','local','lab'),worker=new LocalWorker(),muse=museTranscribe}={}) {
  fs.mkdirSync(dataDir,{recursive:true});fs.mkdirSync(path.join(dataDir,'audio'),{recursive:true});fs.mkdirSync(path.join(dataDir,'derived'),{recursive:true});
  const dbPath=path.join(dataDir,'catalog.json');
  const db=fs.existsSync(dbPath)?JSON.parse(fs.readFileSync(dbPath,'utf8')):{schema:1,audios:[],configs:[],runs:[]};
  const save=()=>{const tmp=dbPath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,dbPath);};
  if(!db.configs.length) for(const engine of ['muse','whisper']) db.configs.push({...configuration({engine,name:engine==='muse'?'Muse · base':'Whisper large-v3 · GPU · base'}),id:randomUUID(),createdAt:new Date().toISOString()});
  for(const r of db.runs) if(['queued','running'].includes(r.status)){r.status='interrupted';r.error='Servidor reiniciado antes de terminar.';}
  save();
  let build='unknown';try{build=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();}catch{}
  const sourceHash=hash(Buffer.concat(['backend/lab.mjs','backend/lab-core.mjs','backend/lab-worker.py'].map(f=>fs.readFileSync(path.join(ROOT,f)))));
  let apiKey=process.env.META_API_KEY||process.env.MODEL_API_KEY||'',active=null,closed=false;
  const queuedAt=new Map();
  const viewRun=r=>{const a=db.audios.find(a=>a.id===r.audioId),ref=a?.references.at(-1);return {...r,evaluation:r.status==='completed'?score(ref?.text??null,r.text):null,evaluationReferenceVersion:ref?.version??null};};
  async function pump(){
    if(active||closed)return;
    const r=db.runs.find(r=>r.status==='queued');if(!r)return;
    const controller=new AbortController(); active={id:r.id,controller};
    const start=performance.now();r.status='running';r.startedAt=new Date().toISOString();r.timings.queueMs=Math.max(0,start-(queuedAt.get(r.id)??start));queuedAt.delete(r.id);save();
    const timeout=setTimeout(()=>controller.abort(),300000);
    try {
      const audio=db.audios.find(a=>a.id===r.audioId),config=r.configuration;
      if(config.engine==='muse'&&!apiKey)throw new Error('Falta clave de Meta. Configúrala en el panel local.');
      if(config.engine==='whisper'&&!modelReady())throw new Error('Modelo local incompleto: ejecuta scripts/download-lab-model.py.');
      const derived=path.join(dataDir,'derived',`${r.id}.wav`),prepStart=performance.now();
      await worker.call({command:'prepare',input:path.join(dataDir,'audio',audio.id+'.wav'),output:derived},controller.signal);
      r.timings.prepareMs=performance.now()-prepStart;
      const wav=fs.readFileSync(derived);r.derived={sha256:hash(wav),sampleRate:16000,channels:1,format:'PCM16',originalSha256:audio.sha256};
      const requestStart=performance.now();
      const result=config.engine==='muse'?await muse(wav,config,apiKey,controller.signal):await worker.call({command:'transcribe',input:derived,modelPath:path.join(ROOT,'models','whisper-large-v3-fp16-ov'),beams:config.beams},controller.signal);
      if(controller.signal.aborted||r.status==='cancelled')throw new Error('Cancelado.');
      r.timings.requestMs=performance.now()-requestStart;r.timings.loadMs=result.loadMs??null;r.timings.generateMs=result.generateMs??null;
      r.timings.requestRtf=r.timings.requestMs/audio.durationMs;
      r.result=result;r.text=result.text;r.status='completed';
      r.cost={currency:'USD',estimated:config.engine==='muse'?Math.floor(audio.durationMs/1000)*.18/3600:null,actual:null,rateDate:'2026-10-28',note:'Estimación del audio original; no factura. Coste local no medido.'};
    } catch(e){if(r.status!=='cancelled'){r.status=controller.signal.aborted?'timeout':'error';r.error=String(e.message).slice(0,1000);}}
    finally{clearTimeout(timeout);r.timings.totalMs=performance.now()-start;r.finishedAt=new Date().toISOString();save();active=null;setImmediate(pump);}
  }
  const server=http.createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${server.address().port}`;
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"};
    const json=(value,status=200)=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
    try{
      if(req.headers.host!==new URL(origin).host||req.headers['sec-fetch-site']==='cross-site')return json({error:'Acceso solo desde el laboratorio local.'},403);
      if(!['GET','POST'].includes(req.method))return json({error:'Método no permitido.'},405);
      if(req.method==='POST'&&req.headers.origin!==origin)return json({error:'Origen no permitido.'},403);
      const url=new URL(req.url,origin),p=url.pathname;
      if(req.method==='GET'){
        if(p==='/api/state')return json({audios:db.audios,configs:db.configs,runs:db.runs.map(viewRun),metaConfigured:!!apiKey,modelPresent:modelReady(),build,sourceHash});
        if(p==='/api/export'){const out={...db,schema:'dicta-libre.lab.v1',exportedAt:new Date().toISOString(),build,sourceHash,runs:db.runs.map(viewRun)};if(url.searchParams.get('format')==='csv'){res.writeHead(200,{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="dicta-lab.csv"'});return res.end('\uFEFF'+csv(out.runs));}res.setHeader('Content-Disposition','attachment; filename="dicta-lab.json"');return json(out);}
        const audio=db.audios.find(a=>p===`/api/audio/${a.id}`);
        if(audio){res.writeHead(200,{...headers,'Content-Type':'audio/wav'});return res.end(fs.readFileSync(path.join(dataDir,'audio',audio.id+'.wav')));}
        const file={'/':'apps/lab/index.html','/lab.js':'apps/lab/lab.js','/style.css':'apps/lab/style.css'}[p];
        if(file){res.writeHead(200,{...headers,'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(ROOT,file)));}
        return json({error:'No encontrado.'},404);
      }
      const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>40*1024*1024)throw new Error('Máximo 40 MB por petición.');chunks.push(b);}
      const raw=Buffer.concat(chunks);
      if(p==='/api/audio'){
        const info=wavInfo(raw),sha256=hash(raw),existing=db.audios.find(a=>a.sha256===sha256);if(existing)return json(existing);
        const audio={id:randomUUID(),name:decodeURIComponent(req.headers['x-file-name']||'audio.wav').slice(0,160),sha256,...info,createdAt:new Date().toISOString(),references:[]};
        fs.writeFileSync(path.join(dataDir,'audio',audio.id+'.wav'),raw);db.audios.push(audio);save();return json(audio,201);
      }
      if(raw.length>100000)throw new Error('Petición JSON demasiado grande.');
      const m=JSON.parse(raw.toString()||'{}');
      if(p==='/api/key'){if(typeof m.key!=='string'||m.key.length>4096)throw new Error('Clave inválida.');apiKey=m.key.trim();return json({configured:!!apiKey});}
      if(p==='/api/references'){
        const a=db.audios.find(a=>a.id===m.audioId);if(!a)throw new Error('Audio desconocido.');
        if(typeof m.text!=='string'||m.text.length>8000)throw new Error('Referencia inválida.');
        a.references.push({version:a.references.length+1,text:m.text,createdAt:new Date().toISOString()});save();return json(a);
      }
      if(p==='/api/configs'){
        const previous=m.parentId?db.configs.find(c=>c.id===m.parentId):null;if(m.parentId&&!previous)throw new Error('Versión anterior desconocida.');
        const config={...configuration(m,previous),id:randomUUID(),createdAt:new Date().toISOString()};db.configs.push(config);save();return json(config,201);
      }
      if(p==='/api/runs'){
        const aids=[...new Set(m.audioIds??[])],cids=[...new Set(m.configIds??[])],repeats=Number(m.repeats??1);
        if(!aids.length||!cids.length||!Number.isInteger(repeats)||repeats<1||repeats>3||aids.length*cids.length*repeats>100)throw new Error('Selecciona audios/configuraciones: máximo 100 ejecuciones, 1–3 repeticiones.');
        const audios=aids.map(id=>db.audios.find(a=>a.id===id)),configs=cids.map(id=>db.configs.find(c=>c.id===id));if(audios.includes(undefined)||configs.includes(undefined))throw new Error('Selección desconocida.');
        if(configs.some(c=>c.engine==='muse')&&!apiKey)throw new Error('Configura la clave de Meta antes de ejecutar Muse.');
        if(configs.some(c=>c.engine==='whisper'&&c.beams!==1))throw new Error('Esta variante de búsqueda falló en el runtime GPU. Usa Whisper base (beams 1); el fallo histórico se conserva.');
        if(db.runs.filter(r=>['queued','running'].includes(r.status)).length+aids.length*cids.length*repeats>100)throw new Error('Cola llena.');
        const batchId=randomUUID(),created=[];
        for(let rep=0;rep<repeats;rep++)for(let ai=0;ai<audios.length;ai++)for(const c of ((rep+ai)%2?[...configs].reverse():configs)){
          const a=audios[ai],r={id:randomUUID(),batchId,audioId:a.id,audioHash:a.sha256,configId:c.id,configuration:structuredClone(c),referenceAtRun:structuredClone(a.references.at(-1)??null),repeat:rep+1,build,sourceHash,modelRevision:c.engine==='whisper'?MODEL_REVISION:null,createdAt:new Date().toISOString(),status:'queued',text:null,error:null,timings:{queueMs:null,prepareMs:null,loadMs:null,generateMs:null,requestMs:null,totalMs:null,firstTextMs:null}};
          r.environment={os:os.platform(),osRelease:os.release(),cpu:os.cpus()[0]?.model??null,totalRamBytes:os.totalmem(),node:process.version,network:null,source:'uploaded-file'};
          r.audioDurationMs=a.durationMs;
          db.runs.push(r);queuedAt.set(r.id,performance.now());created.push(r.id);
        }save();setImmediate(pump);return json({batchId,runIds:created},202);
      }
      if(p==='/api/cancel'){const r=db.runs.find(r=>r.id===m.id);if(!r)throw new Error('Ejecución desconocida.');if(['queued','running'].includes(r.status)){r.status='cancelled';r.error='Cancelado por el usuario.';if(active?.id===r.id)active.controller.abort();save();}return json(viewRun(r));}
      return json({error:'No encontrado.'},404);
    }catch(e){if(!res.headersSent)json({error:e.message},400);else res.end();}
  });
  return {server,db,close:()=>{closed=true;active?.controller.abort();worker.close();server.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const lab=createLab();lab.server.listen(Number(process.env.LAB_PORT||8789),'127.0.0.1',()=>console.log(`Dicta Libre Lab: http://127.0.0.1:${lab.server.address().port}`));
}
