import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import os from 'node:os';
import {attachLiveBridge,demoConnection} from './live-bridge.mjs';
import {loadMetaKey,saveMetaKey,checkMetaKey} from './meta-key.mjs';
import {COMMAND_VERSION} from './dictation-commands.mjs';
import {NUMBER_VERSION} from './number-format.mjs';
import {TERM_VERSION} from './term-format.mjs';
import {applyFormatting} from './format-pipeline.mjs';
import {attachMuseStream} from './muse-stream.mjs';
import {createReviewer,reviewWithMeta} from './meta-review.mjs';
import {reviewContext} from './review-context.mjs';
import {createStudy,studyCsv,comparePair} from './lab-study.mjs';
import {STREAM_PREPARATION} from './stream-audio.mjs';
import { wavInfo, hash, configuration, score, csv } from './lab-core.mjs';
import {validateGlossary,glossaryToConfig} from './vocabulary.mjs';
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
export function createLab({dataDir=path.join(ROOT,'data','local','lab'),keyFile=path.join(ROOT,'.env.local'),worker=new LocalWorker(),muse=museTranscribe,streamEndpoint,reviewProvider=reviewWithMeta,templateFile=path.join(ROOT,'data','local','templates','catalog.json'),glossaryDir=path.join(ROOT,'data','vocabulario','glosarios')}={}) {
  // Glosarios versionados del repo: configuraciones de Muse de solo lectura, nunca escritas en el catálogo.
  const builtinConfigs=[];if(fs.existsSync(glossaryDir))for(const f of fs.readdirSync(glossaryDir).filter(f=>f.endsWith('.json')).sort()){try{builtinConfigs.push(glossaryToConfig(validateGlossary(JSON.parse(fs.readFileSync(path.join(glossaryDir,f),'utf8')))));}catch(e){console.error(`Glosario omitido (${f}): ${e.message}`);}}
  const findConfig=id=>db.configs.find(c=>c.id===id)??builtinConfigs.find(c=>c.id===id);
  fs.mkdirSync(dataDir,{recursive:true});fs.mkdirSync(path.join(dataDir,'audio'),{recursive:true});fs.mkdirSync(path.join(dataDir,'derived'),{recursive:true});
  const dbPath=path.join(dataDir,'catalog.json');
  const db=fs.existsSync(dbPath)?JSON.parse(fs.readFileSync(dbPath,'utf8')):{schema:1,audios:[],configs:[],runs:[]};
  const save=()=>{const tmp=dbPath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,dbPath);};
  if(!db.configs.length) for(const engine of ['muse','whisper']) db.configs.push({...configuration({engine,name:engine==='muse'?'Muse · base':'Whisper large-v3 · GPU · base'}),id:randomUUID(),createdAt:new Date().toISOString()});
  for(const r of db.runs) if(['queued','running'].includes(r.status)){r.status='interrupted';r.error='Servidor reiniciado antes de terminar.';}
  save();
  let build='unknown';try{build=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();}catch{}
  const sourceHash=hash(Buffer.concat(['backend/lab.mjs','backend/lab-study.mjs','apps/lab/study.js','apps/shared/lab-timing.js','backend/meta-key.mjs','backend/meta-review.mjs','backend/review-context.mjs','backend/vocabulary.mjs','backend/format-pipeline.mjs','backend/term-format.mjs','data/vocabulario/formas-dictadas.v1.json','apps/desktop/report-review.js','apps/shared/review-ui.js','backend/dictation-commands.mjs','backend/number-format.mjs','backend/muse-stream.mjs','backend/speech-turns.mjs','backend/stream-audio.mjs','backend/lab-core.mjs','backend/lab-worker.py','backend/live-bridge.mjs','apps/desktop/live.js','apps/desktop/report-editor.js','apps/shared/report-model.js','apps/desktop/stream-client.js','apps/desktop/desktop.js','apps/mobile/mobile.js','apps/shared/metrics.js','apps/shared/style.css'].map(f=>fs.readFileSync(path.join(ROOT,f)))));
  let apiKey=loadMetaKey(keyFile),active=null,closed=false;
  const reviewer=createReviewer({db,save,getKey:()=>apiKey,sourceHash,build,provider:reviewProvider});
  const study=createStudy({db,save,build,sourceHash});
  const queuedAt=new Map();
  const evaluationCache=new Map();
  const evaluated=(r,ref)=>{const key=JSON.stringify([r.text,ref?.text??null]);const old=evaluationCache.get(r.id);if(old?.key===key)return old.value;const value=score(ref?.text??null,r.text);if(evaluationCache.size>=500)evaluationCache.delete(evaluationCache.keys().next().value);evaluationCache.set(r.id,{key,value});return value;};
  const viewRun=r=>{const a=db.audios.find(a=>a.id===r.audioId),ref=a?.references.at(-1);return {...r,evaluation:r.status==='completed'?evaluated(r,ref):null,evaluationReferenceVersion:ref?.version??null};};
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
      r.result=result;r.text=result.text;
      applyFormatting(r);
      r.timings.commandMs=r.formatting?.elapsedMs??0;r.status='completed';
      r.cost={currency:'USD',estimated:config.engine==='muse'?Math.floor(audio.durationMs/1000)*.18/3600:null,actual:null,rateDate:'2026-10-28',note:'Estimación del audio original; no factura. Coste local no medido.'};
    } catch(e){if(r.status!=='cancelled'){r.status=controller.signal.aborted?'timeout':'error';r.error=String(e.message).slice(0,1000);}}
    finally{clearTimeout(timeout);r.timings.totalMs=performance.now()-start;r.finishedAt=new Date().toISOString();save();if(r.status==='completed'&&r.reviewEnabled)reviewer.enqueue(r.id);active=null;setImmediate(pump);}
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
        if(p==='/api/study')return json({records:db.studyRecords,build,sourceHash});
        if(p==='/api/study/export'){res.setHeader('Content-Disposition','attachment; filename="dicta-estudio.'+(url.searchParams.get('format')==='csv'?'csv':'json')+'"');if(url.searchParams.get('format')==='csv'){res.setHeader('Content-Type','text/csv; charset=utf-8');return res.end('\uFEFF'+studyCsv(db.studyRecords));}return json({schema:'lab-study-v1',exportedAt:new Date().toISOString(),records:db.studyRecords});}
        if(p==='/api/live-info')return json({mobileOrigin:demoConnection(ROOT).origin});
        if(p==='/api/templates'){if(!fs.existsSync(templateFile))return json({templates:[],references:[],summary:null});return json(JSON.parse(fs.readFileSync(templateFile,'utf8')));}
        if(p.startsWith('/api/report-reviews/')){const r=db.reviews.find(r=>r.scope==='report'&&r.id===p.split('/').at(-1));return r?json(r):json({error:'Revisión desconocida.'},404);}
        if(p==='/api/state')return json({audios:db.audios,configs:[...db.configs,...builtinConfigs],runs:db.runs.map(viewRun),reviews:db.reviews,reviewDocuments:db.reviewDocuments,metaConfigured:!!apiKey,modelPresent:modelReady(),build,sourceHash});
        if(p==='/api/reviews/export'){
          const cell=v=>'"'+String(v??'').replaceAll('"','""').replace(/^[=+@-]/,m=>' '+m)+'"';
          const rows=[['reviewId','runId','model','status','queueMs','requestMs','validationMs','suggestionId','original','replacement','category','decision'],...db.reviews.flatMap(r=>(r.suggestions.length?r.suggestions:[{}]).map(s=>[r.id,r.runId,r.config.model,r.status,r.timings.queueMs,r.timings.requestMs,r.timings.validationMs,s.id,s.original,s.replacement,s.category,s.status]))];
          res.writeHead(200,{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="dicta-revisiones.csv"'});return res.end('\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n'));
        }
        if(p==='/api/export'){const out={...db,schema:'dicta-libre.lab.v1',exportedAt:new Date().toISOString(),build,sourceHash,runs:db.runs.map(viewRun)};if(url.searchParams.get('format')==='csv'){res.writeHead(200,{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="dicta-lab.csv"'});return res.end('\uFEFF'+csv(out.runs));}res.setHeader('Content-Disposition','attachment; filename="dicta-lab.json"');return json(out);}
        const audio=db.audios.find(a=>p===`/api/audio/${a.id}`);
        if(audio){res.writeHead(200,{...headers,'Content-Type':'audio/wav'});return res.end(fs.readFileSync(path.join(dataDir,'audio',audio.id+'.wav')));}
        const fonts=['publicsans-400.ttf', 'publicsans-600.ttf', 'publicsans-700.ttf', 'sourceserif4-400.ttf', 'atkinsonhyperlegiblemono-400.ttf'];
        if(fonts.some(f=>p==='/fonts/'+f)){res.writeHead(200,{...headers,'Content-Type':'font/ttf'});return res.end(fs.readFileSync(path.join(ROOT,'apps/shared/fonts',p.slice(7))));}
        const file={'/':'apps/lab/index.html','/study.js':'apps/lab/study.js','/lab.js':'apps/lab/lab.js','/style.css':'apps/lab/style.css','/live':'apps/desktop/index.html','/startup.js':'apps/desktop/startup.js','/desktop.js':'apps/desktop/desktop.js','/live.js':'apps/desktop/live.js','/stream-client.js':'apps/desktop/stream-client.js','/receiver.css':'apps/shared/style.css','/qr.js':'node_modules/qrcode-generator/dist/qrcode.js','/review-ui.js':'apps/shared/review-ui.js','/report-editor.js':'apps/desktop/report-editor.js','/report-review.js':'apps/desktop/report-review.js','/shared/report-model.js':'apps/shared/report-model.js','/shared/client.js':'apps/shared/client.js','/shared/protocol.js':'apps/shared/protocol.js','/shared/lab-timing.js':'apps/shared/lab-timing.js','/shared/metrics.js':'apps/shared/metrics.js'}[p];
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
      if(p==='/api/study/compare')return json(comparePair(db.runs.find(r=>r.id===m.a)?viewRun(db.runs.find(r=>r.id===m.a)):null,db.runs.find(r=>r.id===m.b)?viewRun(db.runs.find(r=>r.id===m.b)):null));
      if(p==='/api/study/snapshot')return json(study.snapshot(m));
      if(p==='/api/study')return json(study.append(m),201);
      if(p==='/api/live-measurements'){
        const r=db.runs.find(r=>r.id===m.runId);if(!r||r.status!=='completed')throw Error('Resultado no disponible.');
        const timing={};for(const key of ['receiveStartToFirstTextMs','receiveStartToFinalTextMs','receiveEndToTextMs','stopToTextEstimateMs','clockUncertaintyMs','startToFirstPartialMs']){const v=m[key];timing[key]=typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<600000?v:null;}
        r.live={...timing,recordingId:Number.isInteger(m.recordingId)?m.recordingId:null,source:['tone','microphone'].includes(m.source)?m.source:null,measuredBy:'receiver-browser',savedAt:new Date().toISOString()};
        r.environment.source='live-receiver';save();return json({saved:true});
      }
      if(p==='/api/report-reviews')return json(reviewer.enqueueReport(m),202);
      if(p==='/api/reviews')return json(reviewer.enqueue(m.runId,{retry:m.retry===true}),202);
      if(p==='/api/reviews/cancel')return json(reviewer.cancel(m.id));
      if(p==='/api/reviews/action')return json(reviewer.revise(m));
      if(p==='/api/reviews/shown'){
        const r=db.reviews.find(r=>r.id===m.id);if(!r)throw Error('Revisión desconocida.');
        if(typeof m.elapsedMs==='number'&&Number.isFinite(m.elapsedMs)&&m.elapsedMs>=0&&m.elapsedMs<600000&&r.uiMeasurements.length<10){r.uiMeasurements.push({shownAfterTextMs:m.elapsedMs,source:'browser-dom',context:['laboratory-history','live-final'].includes(m.context)?m.context:null,savedAt:new Date().toISOString()});save();}return json({saved:true});
      }
      if(p==='/api/key'){apiKey=saveMetaKey(keyFile,m.key);return json({configured:!!apiKey,persisted:true});}
      if(p==='/api/meta/check')return json(await checkMetaKey(apiKey));
      if(p==='/api/references'){
        const a=db.audios.find(a=>a.id===m.audioId);if(!a)throw new Error('Audio desconocido.');
        if(typeof m.text!=='string'||m.text.length>8000)throw new Error('Referencia inválida.');
        a.references.push({version:a.references.length+1,text:m.text,createdAt:new Date().toISOString()});save();return json(a);
      }
      if(p==='/api/configs'){
        if(builtinConfigs.some(c=>c.id===m.parentId))throw new Error('Configuración de solo lectura: crea una nueva sin basarte en ella.');const previous=m.parentId?db.configs.find(c=>c.id===m.parentId):null;if(m.parentId&&!previous)throw new Error('Versión anterior desconocida.');
        const config={...configuration(m,previous),id:randomUUID(),createdAt:new Date().toISOString()};db.configs.push(config);save();return json(config,201);
      }
      if(p==='/api/runs'){
        const aids=[...new Set(m.audioIds??[])],cids=[...new Set(m.configIds??[])],repeats=Number(m.repeats??1);
        if(!aids.length||!cids.length||!Number.isInteger(repeats)||repeats<1||repeats>3||aids.length*cids.length*repeats>100)throw new Error('Selecciona audios/configuraciones: máximo 100 ejecuciones, 1–3 repeticiones.');
        const audios=aids.map(id=>db.audios.find(a=>a.id===id)),configs=cids.map(findConfig);if(audios.includes(undefined)||configs.includes(undefined))throw new Error('Selección desconocida.');
        if(configs.some(c=>c.engine==='muse')&&!apiKey)throw new Error('Configura la clave de Meta antes de ejecutar Muse.');
        if(configs.some(c=>c.engine==='whisper'&&c.beams!==1))throw new Error('Esta variante de búsqueda falló en el runtime GPU. Usa Whisper base (beams 1); el fallo histórico se conserva.');
        if(db.runs.filter(r=>['queued','running'].includes(r.status)).length+aids.length*cids.length*repeats>100)throw new Error('Cola llena.');
        const batchId=randomUUID(),created=[];
        for(let rep=0;rep<repeats;rep++)for(let ai=0;ai<audios.length;ai++)for(const c of ((rep+ai)%2?[...configs].reverse():configs)){
          const a=audios[ai],r={id:randomUUID(),batchId,audioId:a.id,audioHash:a.sha256,configId:c.id,configuration:structuredClone(c),referenceAtRun:structuredClone(a.references.at(-1)??null),repeat:rep+1,reviewEnabled:m.reviewEnabled===true,reviewContext:reviewContext(m.reviewContext),commandsEnabled:m.commandsEnabled!==false,numbersEnabled:m.numbersEnabled!==false,termsEnabled:m.termsEnabled!==false,numberVersion:NUMBER_VERSION,termVersion:TERM_VERSION,commandVersion:COMMAND_VERSION,build,sourceHash,modelRevision:c.engine==='whisper'?MODEL_REVISION:null,createdAt:new Date().toISOString(),status:'queued',text:null,error:null,timings:{queueMs:null,prepareMs:null,loadMs:null,generateMs:null,requestMs:null,totalMs:null,firstTextMs:null}};
          r.environment={os:os.platform(),osRelease:os.release(),cpu:os.cpus()[0]?.model??null,totalRamBytes:os.totalmem(),node:process.version,network:null,source:'uploaded-file'};
          r.audioDurationMs=a.durationMs;
          db.runs.push(r);queuedAt.set(r.id,performance.now());created.push(r.id);
        }save();setImmediate(pump);return json({batchId,runIds:created},202);
      }
      if(p==='/api/cancel'){const r=db.runs.find(r=>r.id===m.id);if(!r)throw new Error('Ejecución desconocida.');if(['queued','running'].includes(r.status)){closeStream.cancel(r.id);r.status='cancelled';r.error='Cancelado por el usuario.';if(active?.id===r.id)active.controller.abort();save();}return json(viewRun(r));}
      return json({error:'No encontrado.'},404);
    }catch(e){if(!res.headersSent)json({error:e.message},400);else res.end();}
  });
  const closeBridge=attachLiveBridge(server,()=>demoConnection(ROOT));
  const closeStream=attachMuseStream(server,{endpoint:streamEndpoint,getKey:()=>apiKey,getConfig:findConfig,
    start(config,m){
      const r={id:randomUUID(),batchId:randomUUID(),audioId:null,configId:config.id,configuration:{...structuredClone(config),mode:'streaming',segmentation:m.segmentation,providerMode:m.segmentation==='automatic'?'ENDPOINTING':'PUSH_TO_TALK',preparation:STREAM_PREPARATION},repeat:1,reviewEnabled:m.reviewEnabled===true,reviewContext:reviewContext(m.reviewContext),build,sourceHash,createdAt:new Date().toISOString(),status:'running',text:null,error:null,commandsEnabled:m.commandsEnabled!==false,numbersEnabled:m.numbersEnabled!==false,termsEnabled:m.termsEnabled!==false,commandVersion:COMMAND_VERSION,numberVersion:NUMBER_VERSION,termVersion:TERM_VERSION,
        environment:{os:os.platform(),node:process.version,source:'live-stream',network:null},timings:{queueMs:0,prepareMs:null,requestMs:null,totalMs:null,loadMs:null,generateMs:null}};
      db.runs.push(r);save();return r;
    },
    finish(r,result){
      if(result.original){
        const sha256=hash(result.original);let a=db.audios.find(a=>a.sha256===sha256);
        if(!a){a={id:randomUUID(),name:`stream-${r.id.slice(0,8)}.wav`,sha256,...wavInfo(result.original),createdAt:new Date().toISOString(),references:[]};fs.writeFileSync(path.join(dataDir,'audio',a.id+'.wav'),result.original);db.audios.push(a);}
        r.audioId=a.id;r.audioHash=a.sha256;r.audioDurationMs=a.durationMs;r.referenceAtRun=structuredClone(a.references.at(-1)??null);
      }
      if(result.derived){fs.writeFileSync(path.join(dataDir,'derived',r.id+'.wav'),result.derived);r.derived={sha256:hash(result.derived),originalSha256:r.audioHash,sampleRate:24000,channels:1,format:'PCM16'};}
      r.status=result.status;r.error=result.error;r.text=result.text;r.stream={...result.metrics,events:result.events};
      r.result={text:r.text,device:'Meta API realtime',modelRevision:null,cold:null};
      if(r.status==='completed')applyFormatting(r);
      r.timings.numberFormatMs??=0;r.timings.termFormatMs??=0;r.timings.commandMs=r.formatting?.elapsedMs??0;
      // Session duration includes dictation; not comparable with file processing time.
      r.timings.streamSessionMs=result.metrics.streamSessionMs;r.finishedAt=new Date().toISOString();save();if(r.status==='completed'&&r.reviewEnabled)reviewer.enqueue(r.id);return r;
    }});
  return {server,db,close:()=>{closed=true;reviewer.close();active?.controller.abort();worker.close();closeBridge();closeStream();server.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const lab=createLab();lab.server.listen(Number(process.env.LAB_PORT||8789),'127.0.0.1',()=>console.log(`Dicta Libre Lab: http://127.0.0.1:${lab.server.address().port}`));
}
