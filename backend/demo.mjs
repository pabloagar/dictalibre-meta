// Servidor público de demostración: dictado con Muse-streaming, sin laboratorio, sin disco y con acceso por código.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createReviewer,reviewWithMeta} from './meta-review.mjs';
import {createRelay} from './server.mjs';
import {attachMuseStream} from './muse-stream.mjs';
import {applyFormatting} from './format-pipeline.mjs';
import {configuration} from './lab-core.mjs';
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

export function createDemo({accessCode,metaKey='',reviewProvider=reviewWithMeta,publicOrigin,museEndpoint,maxAudioMinutesPerDay=60,visitorTtlMs=4*3600_000,maxVisitors=200,build=null,templateFile=path.join(ROOT,'data','demo','plantillas-sinteticas.json'),glossaryDir=path.join(ROOT,'data','vocabulario','glosarios'),now=()=>Date.now()}){
  if(!accessCode)throw Error('Falta DEMO_ACCESS_CODE: la demo no se expone sin código de acceso.');
  if(!publicOrigin)throw Error('Falta PUBLIC_ORIGIN.');
  const origin=new URL(publicOrigin).origin;
  const secure=origin.startsWith('https:');
  const visitors=new Map(),logins=new Map();
  const configs=[{...configuration({engine:'muse',name:'Muse · demo'}),id:'demo-muse',createdAt:null,readOnly:true}];
  if(fs.existsSync(glossaryDir))for(const f of fs.readdirSync(glossaryDir).filter(f=>f.endsWith('.json')).sort()){try{configs.push(glossaryToConfig(validateGlossary(JSON.parse(fs.readFileSync(path.join(glossaryDir,f),'utf8')))));}catch(e){console.error(`Glosario omitido (${f}): ${e.message}`);}}
  const usage={day:null,audioMs:0};let activeStreams=0;
  const usedToday=()=>{const day=new Date(now()).toISOString().slice(0,10);if(usage.day!==day){usage.day=day;usage.audioMs=0;}return usage.audioMs;};

  function visitorOf(req){
    for(const part of String(req.headers.cookie??'').split(';')){
      const [k,v]=part.trim().split('=');
      if(k===COOKIE){const visitor=visitors.get(v);if(visitor&&now()-visitor.seen<visitorTtlMs){visitor.seen=now();return visitor;}}
    }
    return null;
  }
  const originOk=req=>req.headers.origin===origin;

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
      if(++bucket.count>10)return accessPage(429,'<p class="status error" role="alert">Demasiados intentos. Espera un minuto.</p>');
      const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>2048)return json({error:'Petición demasiado grande.'},413);chunks.push(b);}
      const code=new URLSearchParams(Buffer.concat(chunks).toString('utf8')).get('code')??'';
      if(!sameSecret(code.trim(),accessCode))return accessPage(401,'<p class="status error" role="alert">Código incorrecto.</p>');
      if(visitors.size>=maxVisitors)return accessPage(503,'<p class="status error" role="alert">La demo está ocupada. Intenta más tarde.</p>');
      const id=randomBytes(32).toString('hex');const visitor={id,seen:now(),runs:[],reviews:[],reviewDocuments:[]}; visitor.reviewer=createReviewer({db:visitor,save:()=>{},getKey:()=>metaKey,build,sourceHash:null,provider:reviewProvider});visitors.set(id,visitor);
      res.writeHead(303,{...headers,Location:'/live','Set-Cookie':`${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(visitorTtlMs/1000)}${secure?'; Secure':''}`});res.end();return true;
    }
    const visitor=visitorOf(req);
    if(p==='/live'&&req.method==='GET'&&!visitor)return accessPage(200);
    if(STATIC[p]&&req.method==='GET')return sendFile(STATIC[p],p==='/live'?MIME.html:MIME.js);
    if(!p.startsWith('/api/'))return false;
    if(!visitor)return json({error:'Ingresa el código de la demostración.'},401);
    if(req.method==='GET'){
      if(p.startsWith('/api/report-reviews/')){const r=visitor.reviews.find(r=>r.id===decodeURIComponent(p.slice('/api/report-reviews/'.length)));return r?json(r):json({error:'Revisión desconocida.'},404);}
      if(p==='/api/live-info')return json({mobileOrigin:origin});
      if(p==='/api/templates')return sendFile(path.relative(ROOT,templateFile),'application/json; charset=utf-8');
      if(p==='/api/state')return json({demo:true,audios:[],configs,runs:visitor.runs,reviews:visitor.reviews,reviewDocuments:[],reportReviewAvailable:!!metaKey,metaConfigured:!!metaKey,modelPresent:false,build,sourceHash:null});
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

  const relay=createRelay({publicOrigin:origin,maxSessions:10,route,clientIp,canCreate:req=>!!visitorOf(req),passUpgrade:req=>req.url==='/asr-stream'});
  const closeStream=attachMuseStream(relay.server,{endpoint:museEndpoint,maxClients:3,getKey:()=>metaKey,getConfig:id=>configs.find(c=>c.id===id),
    allowRequest:req=>originOk(req)&&!!visitorOf(req),
    start(config,m,req){
      const visitor=visitorOf(req);if(!visitor)throw Error('La sesión de la demostración venció. Vuelve a ingresar el código.');
      if(activeStreams>=1)throw Error('Otra persona está dictando en la demostración. Intenta en unos minutos.');
      if(usedToday()>=maxAudioMinutesPerDay*60_000)throw Error('La demostración alcanzó su límite de uso de hoy.');
      activeStreams++;
      const r={id:randomUUID(),configId:config.id,configuration:{model:config.model,name:config.name,mode:'streaming',segmentation:m.segmentation},createdAt:new Date(now()).toISOString(),status:'running',text:null,error:null,commandsEnabled:m.commandsEnabled!==false,numbersEnabled:m.numbersEnabled!==false,termsEnabled:m.termsEnabled!==false,numberVersion:NUMBER_VERSION,termVersion:TERM_VERSION,commandVersion:COMMAND_VERSION,build,reviewEnabled:false,environment:{source:'demo-stream'},timings:{queueMs:0,requestMs:null,totalMs:null}};
      visitor.runs.push(r);if(visitor.runs.length>20)visitor.runs.shift();
      return r;
    },
    finish(r,result){
      activeStreams=Math.max(0,activeStreams-1);
      usedToday();usage.audioMs+=result.metrics.inputDurationMs||0;
      r.status=result.status;r.error=result.error;r.text=result.text;
      // Los buffers de audio y los eventos del proveedor se descartan: en la demo nada se guarda.
      const {segments:_segments,...metrics}=result.metrics;r.stream=metrics;r.result={text:r.text,device:'Meta API realtime',cold:null};
      if(r.status==='completed')applyFormatting(r);
      r.timings.numberFormatMs??=0;r.timings.termFormatMs??=0;r.timings.commandMs=r.formatting?.elapsedMs??0;r.timings.streamSessionMs=metrics.streamSessionMs;r.finishedAt=new Date(now()).toISOString();
      return r;
    }});
  const sweep=setInterval(()=>{
    for(const [id,visitor] of visitors)if(now()-visitor.seen>=visitorTtlMs){visitor.reviewer.close();visitors.delete(id);}
    for(const [ip,bucket] of logins)if(now()-bucket.start>60_000)logins.delete(ip);
  },60_000);sweep.unref();
  return {server:relay.server,visitors,usage,async close(){clearInterval(sweep);for(const v of visitors.values())v.reviewer.close();closeStream();await relay.close();}};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const demo=createDemo({accessCode:process.env.DEMO_ACCESS_CODE,metaKey:(process.env.META_API_KEY||'').trim(),publicOrigin:process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL,maxAudioMinutesPerDay:Number(process.env.DEMO_MAX_AUDIO_MINUTES_PER_DAY||60),build:process.env.RENDER_GIT_COMMIT||null});
  demo.server.listen(Number(process.env.PORT||8787),process.env.HOST||'0.0.0.0',()=>console.log('Dicta Libre: demostración lista.'));
}
