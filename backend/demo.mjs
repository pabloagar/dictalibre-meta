// Servidor público de demostración: dictado con Muse-streaming, sin laboratorio, sin disco, con sesión individual y acceso directo opcional.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createReviewer,reviewWithMeta} from './meta-review.mjs';
import {createRelay} from './server.mjs';
import {attachMuseStream} from './muse-stream.mjs';
import {applyFormatting} from './format-pipeline.mjs';
import {configuration} from './lab-core.mjs';
import {DEMO_KEYWORDS} from './mvp-glossary.mjs';
import {validateGlossary,glossaryToConfig} from './vocabulary.mjs';
import {NUMBER_VERSION} from './number-format.mjs';
import {TERM_VERSION} from './term-format.mjs';
import {COMMAND_VERSION} from './dictation-commands.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const STATIC={'/live':'apps/desktop/index.html','/live.js':'apps/desktop/live.js','/stream-client.js':'apps/desktop/stream-client.js','/review-ui.js':'apps/shared/review-ui.js','/report-editor.js':'apps/desktop/report-editor.js','/report-review.js':'apps/desktop/report-review.js','/shared/report-model.js':'apps/shared/report-model.js','/shared/lab-timing.js':'apps/shared/lab-timing.js'};
const MIME={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8'};
const COOKIE='dicta_demo';
const digest=v=>createHash('sha256').update(String(v)).digest();
const sameSecret=(a,b)=>timingSafeEqual(digest(a),digest(b));
// El proxy del proveedor agrega la IP real; una IP falsificada solo evade este límite, no el código de acceso.
const clientIp=req=>String(req.headers['x-forwarded-for']??'').split(',')[0].trim()||req.socket.remoteAddress||'desconocida';

export function createDemo({accessCode,openAccess=false,metaKey='',reviewProvider=reviewWithMeta,publicOrigin,museEndpoint,maxAudioMinutesPerDay=60,maxConcurrentStreams=10,visitorTtlMs=4*3600_000,maxVisitors=200,build=null,templateFile=path.join(ROOT,'data','demo','plantillas-sinteticas.json'),glossaryDir=path.join(ROOT,'data','vocabulario','glosarios'),now=()=>Date.now()}){
  if(!openAccess&&!accessCode)throw Error('Falta DEMO_ACCESS_CODE: la demo no se expone sin código de acceso.');
  if(!publicOrigin)throw Error('Falta PUBLIC_ORIGIN.');
  if(!Number.isInteger(maxConcurrentStreams)||maxConcurrentStreams<1||maxConcurrentStreams>10)throw Error('DEMO_MAX_CONCURRENT_STREAMS debe ser un entero entre 1 y 10.');
  if(!Number.isFinite(maxAudioMinutesPerDay)||maxAudioMinutesPerDay<=0)throw Error('DEMO_MAX_AUDIO_MINUTES_PER_DAY debe ser positivo.');
  const origin=new URL(publicOrigin).origin;
  const secure=origin.startsWith('https:');
  const visitors=new Map(),logins=new Map();
  const configs=[
    {...configuration({engine:'muse',name:'Glosario MVP',keywords:[...DEMO_KEYWORDS]}),id:'demo-muse',createdAt:null,readOnly:true},
    {...configuration({engine:'muse',name:'Sin glosario'}),id:'demo-muse-no-glossary',createdAt:null,readOnly:true},
    {...configuration({engine:'muse',language:'en',name:'English radiology',keywords:['pleural effusion','pneumothorax','atelectasis','cardiomediastinal silhouette','hydronephrosis','urolithiasis','lymphadenopathy']}),id:'demo-muse-en',createdAt:null,readOnly:true},
    {...configuration({engine:'muse',language:'en',name:'No glossary'}),id:'demo-muse-en-no-glossary',createdAt:null,readOnly:true}
  ];
  if(fs.existsSync(glossaryDir))for(const f of fs.readdirSync(glossaryDir).filter(f=>f.endsWith('.json')).sort()){try{configs.push(glossaryToConfig(validateGlossary(JSON.parse(fs.readFileSync(path.join(glossaryDir,f),'utf8')))));}catch(e){console.error(`Glosario omitido (${f}): ${e.message}`);}}
  const usage={day:null,audioMs:0},activeVisitors=new Map(),runOwners=new Map();
  const concurrency={limit:maxConcurrentStreams,active:0,peak:0,started:0,rejectedCapacity:0,rejectedVisitor:0,rejectedBudget:0};
  const usedToday=()=>{const day=new Date(now()).toISOString().slice(0,10);if(usage.day!==day){usage.day=day;usage.audioMs=0;}return usage.audioMs;};

  function visitorOf(req){
    for(const part of String(req.headers.cookie??'').split(';')){
      const [k,v]=part.trim().split('=');
      if(k===COOKIE){const visitor=visitors.get(v);if(visitor&&now()-visitor.seen<visitorTtlMs){visitor.seen=now();return visitor;}}
    }
    return null;
  }
  const originOk=req=>req.headers.origin===origin;
  function createVisitor(){
    for(const [id,v] of visitors)if(!activeVisitors.has(v)&&now()-v.seen>=visitorTtlMs){v.reviewer.close();visitors.delete(id);}
    if(visitors.size>=maxVisitors)return null;
    const id=randomBytes(32).toString('hex');
    const visitor={id,seen:now(),runs:[],reviews:[],reviewDocuments:[]};
    visitor.reviewer=createReviewer({db:visitor,save:()=>{},getKey:()=>metaKey,build,sourceHash:null,provider:reviewProvider});
    visitors.set(id,visitor);return visitor;
  }
  const sessionCookie=v=>`${COOKIE}=${v.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(visitorTtlMs/1000)}${secure?'; Secure':''}`;


  async function route(req,res,headers){
    const url=new URL(req.url,origin),p=url.pathname;
    const json=(value,status=200)=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));return true;};
    const sendFile=async(file,type,status=200,transform=x=>x)=>{const body=await fs.promises.readFile(path.join(ROOT,file));res.writeHead(status,{...headers,'Content-Type':type});res.end(transform(body));return true;};
    const accessPage=(status,message='')=>sendFile('apps/demo/access.html',MIME.html,status,b=>b.toString('utf8').replace('<!--mensaje-->',message));
    if(p==='/'){res.writeHead(303,{...headers,Location:'/live'});res.end();return true;}
    if(p==='/demo/access'){
      if(req.method!=='POST')return json({error:'Método no permitido.'},405);
      // Con Referrer-Policy no-referrer el navegador envía Origin «null» al enviar un formulario propio.
      if(!originOk(req)&&!(req.headers.origin==='null'&&req.headers['sec-fetch-site']==='same-origin'))return json({error:'Origen no permitido.'},403);
      const ip=clientIp(req);let bucket=logins.get(ip);
      if(!bucket||now()-bucket.start>60_000)logins.set(ip,bucket={start:now(),count:0});
      if(++bucket.count>10)return accessPage(429,'<p class="status error" role="alert" data-i18n="Demasiados intentos. Espera un minuto.">Demasiados intentos. Espera un minuto.</p>');
      const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>2048)return json({error:'Petición demasiado grande.'},413);chunks.push(b);}
      const code=new URLSearchParams(Buffer.concat(chunks).toString('utf8')).get('code')??'';
      if(!accessCode||!sameSecret(code.trim(),accessCode))return accessPage(401,'<p class="status error" role="alert" data-i18n="Código incorrecto.">Código incorrecto.</p>');
      const visitor=createVisitor();
      if(!visitor)return json({error:'La demo está ocupada. Intenta más tarde.'},503);
      res.writeHead(303,{...headers,Location:'/live','Set-Cookie':sessionCookie(visitor)});res.end();return true;
    }
    let visitor=visitorOf(req);
    if(p==='/live'&&req.method==='GET'&&!visitor){
      if(!openAccess)return accessPage(200);
      visitor=createVisitor();
      if(!visitor)return json({error:'La demo está ocupada. Intenta más tarde.'},503);
      res.setHeader('Set-Cookie',sessionCookie(visitor));
    }
    if(p==='/live'&&req.method==='GET'&&visitor)res.setHeader('Set-Cookie',sessionCookie(visitor));
    if(STATIC[p]&&req.method==='GET')return sendFile(STATIC[p],p==='/live'?MIME.html:MIME.js);
    if(!p.startsWith('/api/'))return false;
    if(!visitor)return json({error:'Abre /live para iniciar tu sesión.'},401);
    if(req.method==='GET'){
      if(p.startsWith('/api/report-reviews/')){const r=visitor.reviews.find(r=>r.id===decodeURIComponent(p.slice('/api/report-reviews/'.length)));return r?json(r):json({error:'Revisión desconocida.'},404);}
      if(p==='/api/live-info')return json({mobileOrigin:origin});
      if(p==='/api/templates'){const catalogue=JSON.parse(await fs.promises.readFile(templateFile,'utf8'));if(url.searchParams.get('lang')==='en'){catalogue.templates=catalogue.templates.map(t=>({...t,...t.locales?.en}));catalogue.language='en';}else catalogue.language='es';return json(catalogue);}
      if(p==='/api/state')return json({demo:true,audios:[],configs,runs:visitor.runs,reviews:visitor.reviews,reviewDocuments:[],reportReviewAvailable:!!metaKey,metaConfigured:!!metaKey,modelPresent:false,build,sourceHash:null,concurrency:{...concurrency}});
      return json({error:'No disponible en la demostración.'},404);
    }
    if(req.method!=='POST'||!originOk(req))return json({error:'Origen no permitido.'},403);
    const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>100_000)return json({error:'Petición demasiado grande.'},413);chunks.push(b);}
    let m;try{m=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{return json({error:'JSON inválido.'},400);}
    if(!m||typeof m!=='object'||Array.isArray(m))return json({error:'Se esperaba un objeto JSON.'},400);
    if(p==='/api/report-reviews'){if(!metaKey)return json({error:'Meta no está configurado.'},503);if(visitor.reviews.length>=30)return json({error:'Límite de revisiones de esta sesión alcanzado.'},429);try{return json(visitor.reviewer.enqueueReport(m),202);}catch(e){return json({error:e.message},400);}}
    if(p==='/api/reviews/cancel'){try{return json(visitor.reviewer.cancel(m.id));}catch{return json({error:'Revisión desconocida.'},404);}}
    if(p==='/api/cancel'){const run=visitor.runs.find(r=>r.id===m.id);if(!run)return json({error:'Ejecución desconocida.'},404);if(run.status==='running')closeStream.cancel(run.id);return json({id:run.id,status:run.status});}
    if(p==='/api/live-measurements')return json({saved:false});
    return json({error:'No disponible en la demostración.'},404);
  }

  const relay=createRelay({publicOrigin:origin,maxSessions:30,route,clientIp,canCreate:req=>!!visitorOf(req),passUpgrade:req=>req.url==='/asr-stream'});
  const closeStream=attachMuseStream(relay.server,{endpoint:museEndpoint,maxClients:maxConcurrentStreams*2+2,getKey:()=>metaKey,getConfig:id=>configs.find(c=>c.id===id),
    allowRequest:req=>originOk(req)&&!!visitorOf(req),
    start(config,m,req){
      const visitor=visitorOf(req);if(!visitor)throw Error('La sesión de la demostración venció. Vuelve a abrir /live.');
      if(activeVisitors.has(visitor)){concurrency.rejectedVisitor++;throw Error('Ya tienes un dictado en curso. Espera a que termine.');}
      if(concurrency.active>=maxConcurrentStreams){concurrency.rejectedCapacity++;throw Error('Los '+maxConcurrentStreams+' cupos de dictado están ocupados. Intenta nuevamente al terminar una toma.');}
      if(usedToday()>=maxAudioMinutesPerDay*60_000){concurrency.rejectedBudget++;throw Error('La demostración alcanzó su límite de uso de hoy.');}
      const r={id:randomUUID(),configId:config.id,configuration:{model:config.model,name:config.name,language:config.language,mode:'streaming',segmentation:m.segmentation},createdAt:new Date(now()).toISOString(),status:'running',text:null,error:null,commandsEnabled:m.commandsEnabled!==false,numbersEnabled:m.numbersEnabled!==false,termsEnabled:m.termsEnabled!==false,numberVersion:NUMBER_VERSION,termVersion:TERM_VERSION,commandVersion:COMMAND_VERSION,build,reviewEnabled:false,environment:{source:'demo-stream'},timings:{queueMs:0,requestMs:null,totalMs:null}};
      activeVisitors.set(visitor,r.id);runOwners.set(r.id,visitor);concurrency.active++;concurrency.started++;concurrency.peak=Math.max(concurrency.peak,concurrency.active);
      visitor.runs.push(r);if(visitor.runs.length>20)visitor.runs.shift();
      return r;
    },
    onAudio(r,{durationMs}){
      // Contabilizar cada bloque antes de enviarlo: presupuesto compartido, incluso en tomas fallidas.
      if(usedToday()+durationMs>maxAudioMinutesPerDay*60_000){concurrency.rejectedBudget++;throw Error('La demostración alcanzó su límite de uso de hoy.');}
      usage.audioMs+=durationMs;
    },
    finish(r,result){
      const owner=runOwners.get(r.id);if(owner){activeVisitors.delete(owner);runOwners.delete(r.id);concurrency.active--;}

      r.status=result.status;r.error=result.error;r.text=result.text;
      // Los buffers de audio y los eventos del proveedor se descartan: en la demo nada se guarda.
      const {segments:_segments,...metrics}=result.metrics;r.stream=metrics;r.result={text:r.text,device:'Meta API realtime',cold:null};
      if(r.status==='completed')applyFormatting(r);
      r.timings.numberFormatMs??=0;r.timings.termFormatMs??=0;r.timings.commandMs=r.formatting?.elapsedMs??0;r.timings.streamSessionMs=metrics.streamSessionMs;r.finishedAt=new Date(now()).toISOString();
      return r;
    }});
  const sweep=setInterval(()=>{
    for(const [id,visitor] of visitors)if(!activeVisitors.has(visitor)&&now()-visitor.seen>=visitorTtlMs){visitor.reviewer.close();visitors.delete(id);}
    for(const [ip,bucket] of logins)if(now()-bucket.start>60_000)logins.delete(ip);
  },60_000);sweep.unref();
  return {server:relay.server,visitors,usage,concurrency,async close(){clearInterval(sweep);for(const v of visitors.values())v.reviewer.close();closeStream();await relay.close();}};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const demo=createDemo({openAccess:process.env.DEMO_REQUIRE_ACCESS_CODE!=='true',accessCode:process.env.DEMO_ACCESS_CODE,metaKey:(process.env.META_API_KEY||'').trim(),publicOrigin:process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL,maxAudioMinutesPerDay:Number(process.env.DEMO_MAX_AUDIO_MINUTES_PER_DAY||60),maxConcurrentStreams:Number(process.env.DEMO_MAX_CONCURRENT_STREAMS||10),build:process.env.RENDER_GIT_COMMIT||null});
  demo.server.listen(Number(process.env.PORT||8787),process.env.HOST||'0.0.0.0',()=>console.log('Dicta Libre: demostración lista.'));
}
