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
  const provider=new WebSocketServer({port:0});const seen={keys:[],hold:false,sockets:[]};
  provider.on('connection',s=>{seen.sockets.push(s);let open=false;s.on('message',(b,binary)=>{if(binary)return;const m=JSON.parse(b);if(!open){open=true;seen.keys.push(m.authorization.accessToken);s.send(JSON.stringify({sessionId:'fixture'}));s.send(JSON.stringify({type:'transcript',transcript:'categoría',final:false}));}else if(m.type==='endStream'&&!seen.hold)s.send(JSON.stringify({type:'transcript',transcript:final,final:true,audioProcessedMs:100}));});});
  return {provider,seen};
}
async function start(options={}){
  const {provider,seen}=fakeMuse();await once(provider,'listening');
  const port=await freePort(),origin=`http://127.0.0.1:${port}`;
  const demo=createDemo({accessCode:'codigo-de-prueba',metaKey:'clave-secreta',publicOrigin:origin,museEndpoint:`ws://127.0.0.1:${provider.address().port}`,...options});
  demo.server.listen(port,'127.0.0.1');await once(demo.server,'listening');
  const login=async(code='codigo-de-prueba',ip='10.0.0.1')=>{const r=await fetch(origin+'/demo/access',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','X-Forwarded-For':ip},body:new URLSearchParams({code})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0]??null,location:r.headers.get('location'),raw:r.headers.get('set-cookie')};};
  const get=(p,cookie)=>fetch(origin+p,{headers:cookie?{Cookie:cookie}:{},redirect:'manual'});
  const post=(p,cookie,body={})=>fetch(origin+p,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const dictate=async(cookie,{end=true}={})=>{
    const ws=new WebSocket(origin.replace('http:','ws:')+'/asr-stream',{origin,headers:{Cookie:cookie}});await once(ws,'open');
    const messages=[];ws.on('message',b=>messages.push(JSON.parse(b)));const closed=once(ws,'close');
    const pcm=Buffer.alloc(9600);ws.send(JSON.stringify({type:'start',rate:48000,configId:'demo-muse',commandsEnabled:true,numbersEnabled:true,termsEnabled:true}));
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
    for(const p of ['/api/key','/api/audio','/api/runs','/api/configs','/api/references','/api/reviews','/api/report-reviews','/api/meta/check'])assert.equal((await d.post(p,cookie,{key:'otra'})).status,404,p);
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

test('demo: una persona dicta a la vez y respeta el límite diario',async()=>{
  const d=await start({maxAudioMinutesPerDay:0.001});
  try{
    const a=(await d.login()).cookie,b=(await d.login()).cookie;
    d.seen.hold=true;
    const first=await d.dictate(a,{end:false});await new Promise(r=>setTimeout(r,60));
    const second=await d.dictate(b,{end:false});await second.closed;
    assert.match(second.messages.at(-1).message,/Otra persona está dictando/);
    first.ws.send(JSON.stringify({type:'cancel'}));await first.closed;
    assert.equal((await (await d.get('/api/state',a)).json()).runs[0].status,'cancelled');
    d.seen.hold=false;
    const third=await d.dictate(a);await third.closed;
    const fourth=await d.dictate(b,{end:false});await fourth.closed;
    assert.match(fourth.messages.at(-1).message,/límite de uso/);
  }finally{await d.stop();}
});

test('demo: el contenedor incluye lo necesario y las plantillas son sintéticas',()=>{
  const docker=fs.readFileSync(new URL('../Dockerfile',import.meta.url),'utf8'),ignore=fs.readFileSync(new URL('../.dockerignore',import.meta.url),'utf8');
  for(const need of ['COPY apps','COPY backend','COPY data/vocabulario','COPY data/demo','backend/demo.mjs'])assert.ok(docker.includes(need),need);
  assert.match(ignore,/^\.env\*/m);assert.match(ignore,/^data\/local/m);assert.match(ignore,/^data\/private/m);assert.doesNotMatch(ignore,/^data$/m);
  const templates=JSON.parse(fs.readFileSync(new URL('../data/demo/plantillas-sinteticas.json',import.meta.url),'utf8')).templates;
  for(const t of templates){assert.match(t.name,/estructura de ejemplo/);assert.deepEqual(t.sources,[]);}
});
