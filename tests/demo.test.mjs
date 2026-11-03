import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import {once} from 'node:events';
import {WebSocket,WebSocketServer} from 'ws';
import {createDemo} from '../backend/demo.mjs';
import {hash} from '../backend/lab-core.mjs';

const freePort=async()=>{const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const {port}=s.address();s.close();await once(s,'close');return port;};
function fakeMuse(final='categoría biurads cuatro a punto'){
  const provider=new WebSocketServer({port:0});const seen={keys:[],languages:[],keywords:[],hold:false,sockets:[]};
  provider.on('connection',s=>{seen.sockets.push(s);const number=seen.sockets.length;let open=false;s.on('message',(b,binary)=>{if(binary)return;const m=JSON.parse(b);if(!open){open=true;seen.keys.push(m.authorization.accessToken);seen.languages.push(m.languageBias);seen.keywords.push(m.keywords);s.send(JSON.stringify({sessionId:'fixture'}));s.send(JSON.stringify({type:'transcript',transcript:'categoría',final:false}));}else if(m.type==='endStream'&&!seen.hold)s.send(JSON.stringify({type:'transcript',transcript:typeof final==='function'?final(number):final,final:true,audioProcessedMs:100}));});});
  return {provider,seen};
}
async function start(options={}){
  const {provider,seen}=fakeMuse(options.syntheticFinal);await once(provider,'listening');
  const port=await freePort(),origin=`http://127.0.0.1:${port}`;
  const demo=createDemo({accessCode:'codigo-de-prueba',metaKey:'clave-secreta',publicOrigin:origin,museEndpoint:`ws://127.0.0.1:${provider.address().port}`,...options});
  demo.server.listen(port,'127.0.0.1');await once(demo.server,'listening');
  const login=async(code='codigo-de-prueba',ip='10.0.0.1')=>{const r=await fetch(origin+'/demo/access',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','X-Forwarded-For':ip},body:new URLSearchParams({code})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0]??null,location:r.headers.get('location'),raw:r.headers.get('set-cookie')};};
  const get=(p,cookie)=>fetch(origin+p,{headers:cookie?{Cookie:cookie}:{},redirect:'manual'});
  const post=(p,cookie,body={})=>fetch(origin+p,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const dictate=async(cookie,{end=true,configId='demo-muse'}={})=>{
    const ws=new WebSocket(origin.replace('http:','ws:')+'/asr-stream',{origin,headers:{Cookie:cookie}});await once(ws,'open');
    const messages=[];ws.on('message',b=>messages.push(JSON.parse(b)));const closed=once(ws,'close');
    const pcm=Buffer.alloc(9600);ws.send(JSON.stringify({type:'start',rate:48000,configId,commandsEnabled:true,numbersEnabled:true,termsEnabled:true}));
    if(end){ws.send(pcm);ws.send(JSON.stringify({type:'end',pcmHash:hash(pcm)}));}
    return {ws,messages,closed};
  };
  return {origin,demo,provider,seen,login,get,post,dictate,async stop(){provider.close();const closed=once(demo.server,'close').catch(()=>{});await demo.close();await closed;}};
}

test('demo: no arranca sin código de acceso ni origen público',()=>{
  assert.throws(()=>createDemo({publicOrigin:'https://demo.example'}),/DEMO_ACCESS_CODE/);
  assert.throws(()=>createDemo({accessCode:'x'}),/PUBLIC_ORIGIN/);
});

test('demo: el código protege dictado y API; el celular y lo público siguen abiertos',async()=>{
  const d=await start();
  try{
    assert.match(await (await d.get('/live')).text(),/Código de acceso/);
    assert.equal((await d.get('/')).status,303);
    for(const p of ['/api/state','/api/templates','/api/live-info'])assert.equal((await d.get(p)).status,401,p);
    assert.equal((await d.get('/mobile')).status,200);assert.equal((await d.get('/health')).status,200);
    const bad=await d.login('incorrecto');assert.equal(bad.status,401);assert.equal(bad.cookie,null);
    const forged=await fetch(d.origin+'/demo/access',{method:'POST',headers:{Origin:'https://evil.invalid','Content-Type':'application/x-www-form-urlencoded'},body:'code=codigo-de-prueba'});assert.equal(forged.status,403);
    const form=h=>fetch(d.origin+'/demo/access',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',...h},body:'code=codigo-de-prueba'});
    assert.equal((await form({Origin:'null','Sec-Fetch-Site':'same-origin'})).status,303);
    assert.equal((await form({Origin:'null','Sec-Fetch-Site':'cross-site'})).status,403);
    assert.equal((await form({Origin:'null'})).status,403);
    const ok=await d.login();assert.equal(ok.status,303);assert.equal(ok.location,'/live');assert.match(ok.raw,/HttpOnly/);assert.match(ok.raw,/SameSite=Lax/);
    assert.match(await (await d.get('/live',ok.cookie)).text(),/id="create"/);
    const state=await (await d.get('/api/state',ok.cookie)).json();assert.equal(state.demo,true);assert.equal(state.metaConfigured,true);assert.ok(!JSON.stringify(state).includes('clave-secreta'));
    assert.equal((await (await d.get('/api/live-info',ok.cookie)).json()).mobileOrigin,d.origin);
    assert.ok((await (await d.get('/api/templates',ok.cookie)).json()).templates.length>=3);
  }finally{await d.stop();}
});

test('demo: limita intentos de código por IP',async()=>{
  const d=await start();
  try{
    for(let i=0;i<10;i++)assert.equal((await d.login('malo','10.9.9.9')).status,401);
    assert.equal((await d.login('codigo-de-prueba','10.9.9.9')).status,429);
    assert.equal((await d.login('codigo-de-prueba','10.9.9.8')).status,303);
  }finally{await d.stop();}
});

test('demo: rutas del laboratorio y escritura de clave no existen',async()=>{
  const d=await start();
  try{
    const {cookie}=await d.login();
    for(const p of ['/api/export','/api/study','/api/reviews/export','/lab.js','/study.js','/style-lab.css'])assert.equal((await d.get(p,cookie)).status,404,p);
    for(const p of ['/api/key','/api/audio','/api/runs','/api/configs','/api/references','/api/reviews','/api/meta/check'])assert.equal((await d.post(p,cookie,{key:'otra'})).status,404,p);
    assert.equal((await fetch(d.origin+'/api/cancel',{method:'POST',headers:{Origin:'https://evil.invalid',Cookie:cookie},body:'{}'})).status,403);
  }finally{await d.stop();}
});

test('demo: toma completa con formato, sin audio guardado y aislada por visitante',async()=>{
  const d=await start();
  try{
    const a=(await d.login()).cookie,b=(await d.login()).cookie;
    const take=await d.dictate(a);await take.closed;
    assert.deepEqual(d.seen.keys,['Bearer clave-secreta']);
    assert.ok(take.messages.some(m=>m.type==='started'));assert.equal(take.messages.at(-1).status,'completed');
    const mine=await (await d.get('/api/state',a)).json();const run=mine.runs[0];
    assert.equal(run.text,'categoría biurads cuatro a punto');assert.equal(run.formatting.text,'Categoría BI-RADS 4A.');
    const dump=JSON.stringify(run);for(const prohibido of ['original','derived','visitor','reviewContext'])assert.ok(!dump.includes(`"${prohibido}"`),prohibido);
    assert.equal(run.audioId,undefined);assert.equal(run.stream.events,undefined);
    assert.deepEqual((await (await d.get('/api/state',b)).json()).runs,[]);
    assert.equal((await d.post('/api/cancel',b,{id:run.id})).status,404);
    assert.ok(d.demo.usage.audioMs>0);
  }finally{await d.stop();}
});

test('demo: dictado sin código o con origen ajeno se rechaza; crear sesión exige código, unirse no',async()=>{
  const d=await start();
  try{
    const {cookie}=await d.login(),ws=d.origin.replace('http:','ws:');
    const anon=new WebSocket(ws+'/asr-stream',{origin:d.origin});await once(anon,'error');
    const foreign=new WebSocket(ws+'/asr-stream',{origin:'https://evil.invalid',headers:{Cookie:cookie}});await once(foreign,'error');
    assert.equal(d.seen.keys.length,0);
    const relay=async headers=>{const s=new WebSocket(ws+'/ws',{origin:d.origin,headers});await once(s,'open');return s;};
    const stranger=await relay({});const refused=once(stranger,'message');stranger.send(JSON.stringify({type:'create'}));assert.equal(JSON.parse((await refused)[0]).type,'error');
    const pc=await relay({Cookie:cookie});const created=once(pc,'message');pc.send(JSON.stringify({type:'create'}));const session=JSON.parse((await created)[0]);assert.equal(session.type,'created');
    const phone=await relay({});const joined=once(phone,'message');phone.send(JSON.stringify({type:'join_qr',token:session.token}));assert.equal(JSON.parse((await joined)[0]).type,'paired');
    for(const s of [stranger,pc,phone])s.terminate();
  }finally{await d.stop();}
});

test('demo: límite configurable y presupuesto diario cobrado antes de enviar audio',async()=>{
  const d=await start({maxAudioMinutesPerDay:0.1/60,maxConcurrentStreams:1});
  try{
    const a=(await d.login()).cookie,b=(await d.login()).cookie;
    d.seen.hold=true;
    const first=await d.dictate(a,{end:false});await new Promise(r=>setTimeout(r,60));
    const second=await d.dictate(b,{end:false});await second.closed;
    assert.match(second.messages.at(-1).message,/cupos de dictado están ocupados/);
    first.ws.send(JSON.stringify({type:'cancel'}));await first.closed;
    assert.equal((await (await d.get('/api/state',a)).json()).runs[0].status,'cancelled');
    d.seen.hold=false;
    const third=await d.dictate(a);await third.closed;
    const fourth=await d.dictate(b,{end:false});await fourth.closed;
    assert.match(fourth.messages.at(-1).message,/límite de uso/);
  }finally{await d.stop();}
});

test('demo: el contenedor incluye lo necesario y las plantillas públicas son informes normales breves sin medidas',()=>{
  const docker=fs.readFileSync(new URL('../Dockerfile',import.meta.url),'utf8'),ignore=fs.readFileSync(new URL('../.dockerignore',import.meta.url),'utf8');
  for(const need of ['COPY apps','COPY backend','COPY data/vocabulario','COPY data/demo','backend/demo.mjs'])assert.ok(docker.includes(need),need);
  assert.match(ignore,/^\.env\*/m);assert.match(ignore,/^data\/local/m);assert.match(ignore,/^data\/private/m);assert.doesNotMatch(ignore,/^data$/m);
  const templates=JSON.parse(fs.readFileSync(new URL('../data/demo/plantillas-sinteticas.json',import.meta.url),'utf8')).templates;
  assert.equal(templates.length,15);
  assert.equal(new Set(templates.map(t=>t.id)).size,15);
  assert.deepEqual(templates.filter(t=>t.defaultFavorite).map(t=>t.id),['demo-rx-torax','demo-tc-torax','demo-tc-abdomen','demo-pielotc','demo-eco-abdominal']);
  assert.match(templates.find(t=>t.id==='demo-pielotc').text,/sin contraste endovenoso/);
  assert.match(templates.find(t=>t.id==='demo-urotc').text,/con fase excretora/);
  for(const t of templates){
    assert.doesNotMatch(t.name,/sintético|ejemplo|completo/i);assert.deepEqual(t.sources,[]);
    assert.ok(t.text.startsWith(t.name.toUpperCase()+'\n\n'));
    assert.ok(t.text.includes('ANTECEDENTES\n\n\n'));
    assert.doesNotMatch(t.text,/Completar antecedentes/);assert.doesNotMatch(t.locales.en.text,/Enter clinical history/);
    for(const heading of ['TÉCNICA','HALLAZGOS','CONCLUSIÓN'])assert.ok(t.text.split(heading+'\n')[1]?.split('\n\n')[0].trim(),`${t.id}: ${heading} con contenido`);
    assert.doesNotMatch(t.text,/\d|\b(?:mm|cm|milímetros|centímetros)\b/iu);
    assert.ok(t.text.trim().split(/\s+/u).length<=100,`${t.id}: informe breve`);
  }
});

test('demo: revisión Spark aislada por visitante, validación y métricas',async()=>{
 let calls=0;
 const d=await start({reviewProvider:async()=>{calls++;return {content:'{"suggestions":[]}',providerModel:'fixture',usage:{total_tokens:5}};}});
 try{
  const a=(await d.login()).cookie,b=(await d.login()).cookie;
  assert.equal((await d.get('/api/state',a)).status,200);
  assert.equal((await (await d.get('/api/state',a)).json()).reportReviewAvailable,true);
  assert.equal((await d.post('/api/report-reviews',a,{text:''})).status,400);
  const r=await d.post('/api/report-reviews',a,{text:'Informe sintético coherente.'});assert.equal(r.status,202);const first=await r.json();
  assert.equal((await d.get('/api/report-reviews/'+first.id,b)).status,404);
  assert.equal((await d.post('/api/reviews/cancel',b,{id:first.id})).status,404);
  let result;for(let i=0;i<50;i++){result=await (await d.get('/api/report-reviews/'+first.id,a)).json();if(result.status==='completed')break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(result.status,'completed');assert.ok(result.timings.totalMs>=0);assert.equal(calls,1);
  const repeat=await (await d.post('/api/report-reviews',a,{text:'Informe sintético coherente.'})).json();assert.equal(repeat.id,first.id);
 }finally{await d.stop();}
});

test('demo: revisor sin clave, cancelación y fallo del proveedor no alteran el informe',async()=>{
 const unconfigured=await start({metaKey:''});
 try{const a=(await unconfigured.login()).cookie;assert.equal((await (await unconfigured.get('/api/state',a)).json()).reportReviewAvailable,false);assert.equal((await unconfigured.post('/api/report-reviews',a,{text:'Sintético'})).status,503);}finally{await unconfigured.stop();}
 let calls=0;
 const d=await start({reviewProvider:async(input,key,signal)=>{calls++;if(input.formattedText==='Fallo sintético')throw Error('Proveedor no disponible');return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Cancelado')),{once:true}));}});
 try{
  const a=(await d.login()).cookie;
  assert.equal((await d.post('/api/report-reviews',a,null)).status,400);
  assert.equal((await d.get('/api/report-reviews/fake')).status,401);
  const pending=await (await d.post('/api/report-reviews',a,{text:'Sintético pendiente'})).json();
  for(let i=0;i<50&&calls===0;i++)await new Promise(r=>setTimeout(r,10));
  const cancelled=await (await d.post('/api/reviews/cancel',a,{id:pending.id})).json();assert.equal(cancelled.status,'cancelled');
  const failure=await (await d.post('/api/report-reviews',a,{text:'Fallo sintético'})).json();let result;
  for(let i=0;i<50;i++){result=await (await d.get('/api/report-reviews/'+failure.id,a)).json();if(result.status==='error')break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(result.status,'error');assert.equal(result.baseText,'Fallo sintético');assert.equal(calls,2);assert.deepEqual(result.suggestions,[]);
 }finally{await d.stop();}
});

 test('demo: default evaluated glossary reaches provider and no-glossary remains selectable',async()=>{
 const d=await start();try{
 const {cookie}=await d.login();const state=await (await d.get('/api/state',cookie)).json();
 const expected=[...JSON.parse(fs.readFileSync('tests/fixtures/human-glossary-plan.json','utf8')).keywords,'punto','coma','dos puntos','nueva línea','nuevo párrafo','punto y coma'];
 assert.equal(state.configs[0].id,'demo-muse');assert.deepEqual(state.configs[0].keywords,expected);
 const first=await d.dictate(cookie);await first.closed;
 const second=await d.dictate(cookie,{configId:'demo-muse-no-glossary'});await second.closed;
 assert.deepEqual(d.seen.keywords,[expected,[]]);
 }finally{await d.stop();}
 });

const waitUntil=async predicate=>{for(let i=0;i<200;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw Error('Condition timed out');};

test('demo: diez dictados solapados, aislamiento, undécimo rechazado y cupos recuperados',async()=>{
 const d=await start({syntheticFinal:n=>'Resultado sintético '+n});
 try{
  const cookies=[];for(let i=0;i<11;i++)cookies.push((await d.login('codigo-de-prueba','10.0.1.'+i)).cookie);
  for(let repetition=0;repetition<3;repetition++){
   const takes=[];
   for(let i=0;i<10;i++){
    takes.push(await d.dictate(cookies[i],{end:false}));
    await waitUntil(()=>takes[i].messages.some(m=>m.type==='ready'));
   }
   assert.equal(d.demo.concurrency.active,10);assert.equal(d.demo.concurrency.peak,10);
   const excess=await d.dictate(cookies[10],{end:false});await excess.closed;
   assert.match(excess.messages.at(-1).message,/10 cupos/);assert.equal(d.demo.concurrency.active,10);
   const duplicate=await d.dictate(cookies[0],{end:false});await duplicate.closed;
   assert.match(duplicate.messages.at(-1).message,/Ya tienes un dictado/);
   const firstId=takes[0].messages.find(m=>m.type==='started').runId;
   assert.equal((await d.post('/api/cancel',cookies[1],{id:firstId})).status,404);
   const pcm=Buffer.alloc(9600);
   for(const take of takes){take.ws.send(pcm);take.ws.send(JSON.stringify({type:'end',pcmHash:hash(pcm)}));}
   await Promise.all(takes.map(t=>t.closed));assert.equal(d.demo.concurrency.active,0);
   for(let i=0;i<10;i++){
    assert.equal(takes[i].messages.at(-1).status,'completed');
    const state=await (await d.get('/api/state',cookies[i])).json();
    assert.equal(state.runs.length,repetition+1);
    assert.equal(state.runs.at(-1).id,takes[i].messages.find(m=>m.type==='started').runId);
    assert.equal(state.runs.at(-1).text,'Resultado sintético '+(repetition*10+i+1));
    assert.equal(state.runs.at(-1).stream.integrityVerified,true);
    assert.equal(state.concurrency.limit,10);assert.equal(state.concurrency.active,0);
   }
   assert.deepEqual((await (await d.get('/api/state',cookies[10])).json()).runs,[]);
  }
  assert.equal(d.demo.concurrency.started,30);assert.equal(d.demo.usage.audioMs,3000);
  assert.equal(d.demo.concurrency.rejectedCapacity,3);assert.equal(d.demo.concurrency.rejectedVisitor,3);
 }finally{await d.stop();}
});

test('demo: presupuesto compartido durante tomas simultáneas, cancelación y cambio de día',async()=>{
 let now=Date.UTC(2026,10,2,23,59);
 const d=await start({maxAudioMinutesPerDay:0.2/60,now:()=>now});
 try{
  const a=(await d.login()).cookie,b=(await d.login()).cookie;
  const first=await d.dictate(a,{end:false}),second=await d.dictate(b,{end:false});
  await waitUntil(()=>d.demo.concurrency.active===2);
  first.ws.send(Buffer.alloc(9600));second.ws.send(Buffer.alloc(9600));
  await waitUntil(()=>d.demo.usage.audioMs===200);
  first.ws.send(Buffer.alloc(9600));await first.closed;
  assert.equal(first.messages.at(-1).status,'error');assert.equal(d.demo.usage.audioMs,200);
  const refused=await d.dictate(a,{end:false});await refused.closed;assert.match(refused.messages.at(-1).message,/límite de uso/);
  second.ws.send(JSON.stringify({type:'cancel'}));await second.closed;assert.equal(d.demo.concurrency.active,0);
  now+=120000;
  const next=await d.dictate(a);await next.closed;assert.equal(next.messages.at(-1).status,'completed');
  assert.equal(d.demo.usage.audioMs,100);assert.equal(d.demo.usage.day,'2026-11-03');
 }finally{await d.stop();}
});

test('demo: desconexión, error de proveedor y cancelación liberan exactamente un cupo',async()=>{
 const d=await start({maxConcurrentStreams:1});
 try{
  const cookie=(await d.login()).cookie;
  for(const kind of ['disconnect','provider','cancel']){
   const take=await d.dictate(cookie,{end:false});await waitUntil(()=>take.messages.some(m=>m.type==='ready'));
   if(kind==='disconnect')take.ws.terminate();
   else if(kind==='provider')d.seen.sockets.at(-1).send(JSON.stringify({type:'error'}));
   else take.ws.send(JSON.stringify({type:'cancel'}));
   await take.closed;await waitUntil(()=>d.demo.concurrency.active===0);
  }
  const next=await d.dictate(cookie);await next.closed;assert.equal(next.messages.at(-1).status,'completed');
  assert.equal(d.demo.concurrency.active,0);assert.equal(d.demo.concurrency.started,4);
 }finally{await d.stop();}
});

test('demo: rechaza límites inválidos antes de arrancar',()=>{
 for(const maxConcurrentStreams of [0,11,1.5,NaN])assert.throws(()=>createDemo({accessCode:'fixture',publicOrigin:'http://localhost',maxConcurrentStreams}),/DEMO_MAX_CONCURRENT_STREAMS/);
 for(const maxAudioMinutesPerDay of [0,-1,NaN,Infinity])assert.throws(()=>createDemo({accessCode:'fixture',publicOrigin:'http://localhost',maxAudioMinutesPerDay}),/DEMO_MAX_AUDIO/);
});


test('demo: language catalogues share favorites; English provider and formatter stay separate from Spanish',async()=>{
 const d=await start({syntheticFinal:'No effusion full stop new paragraph No pneumothorax full stop'});
 try{const {cookie}=await d.login();const en=await (await d.get('/api/templates?lang=en',cookie)).json(),es=await (await d.get('/api/templates?lang=es',cookie)).json();
 assert.equal(en.language,'en');assert.equal(es.language,'es');assert.deepEqual(en.templates.map(t=>t.id),es.templates.map(t=>t.id));assert.equal(en.templates[0].name,'Chest X-ray');assert.equal(es.templates[0].name,'RX de tórax');
 const take=await d.dictate(cookie,{configId:'demo-muse-en'});await take.closed;
 const state=await (await d.get('/api/state',cookie)).json(),run=state.runs.at(-1);assert.equal(run.status,'completed');assert.equal(run.configuration.language,'en');assert.deepEqual(d.seen.languages.at(-1),['English']);assert.equal(run.formatting.text,'No effusion.\n\nNo pneumothorax.');assert.equal(run.numberFormatting,null);assert.equal(state.concurrency.limit,10);
 const spanish=await d.dictate(cookie);await spanish.closed;assert.deepEqual(d.seen.languages.at(-1),['Spanish']);
 for(const asset of ['/shared/i18n.js','/shared/locale-en.js','/shared/access-language.js'])assert.equal((await d.get(asset)).status,200);
 }finally{await d.stop();}
});


test('demo abierta: entrada directa, sesión reutilizada, aislamiento y límite de visitantes',async()=>{
  const d=await start({openAccess:true,accessCode:undefined,maxVisitors:2});
  try{
    assert.equal((await d.get('/api/state')).status,401);
    const a=await d.get('/live?lang=es');
    assert.equal(a.status,200);assert.match(await a.text(),/id="create"/);
    const cookieA=a.headers.get('set-cookie').split(';')[0];
    assert.match(a.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
    assert.equal((await d.get('/live',cookieA)).headers.get('set-cookie'),null);
    const b=await d.get('/live'),cookieB=b.headers.get('set-cookie').split(';')[0];
    assert.notEqual(cookieA,cookieB);
    const take=await d.dictate(cookieA);await take.closed;
    assert.equal((await (await d.get('/api/state',cookieA)).json()).runs.length,1);
    assert.equal((await (await d.get('/api/state',cookieB)).json()).runs.length,0);
    assert.equal((await d.get('/live')).status,503);
    assert.equal((await d.get('/live',cookieA)).status,200);
    assert.equal((await fetch(d.origin+'/api/cancel',{method:'POST',headers:{Origin:'https://evil.invalid',Cookie:cookieA},body:'{}'})).status,403);
    assert.equal((await d.get('/api/export',cookieA)).status,404);
  }finally{await d.stop();}
});
