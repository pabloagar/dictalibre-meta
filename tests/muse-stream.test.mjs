import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {WebSocket,WebSocketServer} from 'ws';
import {createLab} from '../backend/lab.mjs';
import {hash,wavInfo} from '../backend/lab-core.mjs';
import {StreamResampler,pcmWav} from '../backend/stream-audio.mjs';

test('resampler conserva duración y no depende de los límites de bloques',()=>{
 for(const rate of [8000,16000,22050,24000,44100,48000,96000]){
  const pcm=Buffer.alloc(rate*2/10);for(let i=0;i<pcm.length/2;i++)pcm.writeInt16LE(Math.round(5000*Math.sin(2*Math.PI*440*i/rate)),i*2);
  const whole=new StreamResampler(rate),a=Buffer.concat([whole.push(pcm),whole.push(Buffer.alloc(0),true)]);
  const split=new StreamResampler(rate),parts=[];for(let i=0;i<pcm.length;i+=74)parts.push(split.push(pcm.subarray(i,i+74)));parts.push(split.push(Buffer.alloc(0),true));
  assert.deepEqual(Buffer.concat(parts),a);assert.equal(a.length,4800);assert.equal(wavInfo(pcmWav(pcm,rate)).durationMs,100);
 }
 const dc=Buffer.alloc(9600);for(let i=0;i<4800;i++)dc.writeInt16LE(1000,i*2);
 const r=new StreamResampler(48000),out=r.push(dc);assert.ok(Math.abs(out.readInt16LE(200)-1000)<=1);
});

test('streaming: handshake privado, parciales reemplazables, final íntegro y exportación',async()=>{
 const provider=new WebSocketServer({port:0});await once(provider,'listening');let received=0,connections=0;
 provider.on('connection',s=>{connections++;let handshake=false;s.on('message',(b,binary)=>{
  if(binary){received+=b.length;assert.ok(handshake);return;}
  const m=JSON.parse(b);if(!handshake){assert.equal(m.authorization.accessToken,'Bearer test-secret');assert.equal(m.audioEncoding,'PCM_24KHZ');assert.equal(m.partialMode,'CUMULATIVE');assert.deepEqual(m.languageBias,['Spanish']);handshake=true;s.send(JSON.stringify({sessionId:'fixture'}));
   for(const text of ['nódulo','nódulo','nódulo de tres','nódulo de dos'])s.send(JSON.stringify({type:'transcript',transcript:text,final:false}));
  }else if(m.type==='endStream'){s.send(JSON.stringify({type:'transcript',transcript:'nódulo de tres milímetros punto nueva línea',final:true,audioProcessedMs:100}));}
 });});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-stream-'));
 const lab=createLab({dataDir:dir,keyFile:path.join(dir,'.env.local'),worker:{close(){}},reviewProvider:async input=>{assert.equal(input.formattedText,'Nódulo de 3 milímetros.\n');return {content:'{"suggestions":[]}'};},streamEndpoint:`ws://127.0.0.1:${provider.address().port}`});lab.server.listen(0,'127.0.0.1');await once(lab.server,'listening');
 const origin=`http://127.0.0.1:${lab.server.address().port}`,url=origin.replace('http:','ws:')+'/asr-stream';
 const post=(p,m)=>fetch(origin+p,{method:'POST',headers:{Origin:origin},body:JSON.stringify(m)});
 try{
  await post('/api/key',{key:'test-secret'});const config=lab.db.configs.find(c=>c.engine==='muse');
  const bad=new WebSocket(url,{origin:'https://evil.invalid'});await once(bad,'error');assert.equal(connections,0);
  const s=new WebSocket(url,{origin});await once(s,'open');const messages=[];s.on('message',b=>messages.push(JSON.parse(b)));const closed=once(s,'close');
  const pcm=Buffer.alloc(9600);s.send(JSON.stringify({type:'start',rate:48000,configId:config.id,commandsEnabled:true,reviewEnabled:true}));s.send(pcm);s.send(JSON.stringify({type:'end',pcmHash:hash(pcm)}));await closed;
  const r=lab.db.runs.at(-1);assert.equal(r.status,'completed');assert.equal(r.stream.integrityVerified,true);assert.equal(r.stream.partialCount,4);assert.equal(r.stream.duplicatePartialCount,1);assert.equal(r.stream.revisionCount,1);assert.equal(r.formatting.text,'Nódulo de 3 milímetros.\n');assert.equal(received,4800);assert.ok(r.stream.firstPartialMs>=0);assert.ok(r.stream.endToFinalMs>=0);assert.equal(r.timings.totalMs,null);
  assert.equal(r.audioHash,hash(pcmWav(pcm,48000)));assert.equal(messages.filter(m=>m.type==='done').length,1);assert.equal(messages.filter(m=>m.type==='partial').length,4);
  for(let n=0;n<100&&lab.db.reviews[0]?.status!=='completed';n++)await new Promise(r=>setTimeout(r,5));assert.equal(lab.db.reviews.length,1);assert.equal(lab.db.reviews[0].status,'completed');
  const exported=await(await fetch(origin+'/api/export')).text();assert.ok(!exported.includes('test-secret'));assert.ok(exported.includes('revisionCount'));assert.ok(fs.existsSync(path.join(dir,'audio',r.audioId+'.wav')));
  const invalid=new WebSocket(url,{origin});await once(invalid,'open');const invalidClosed=once(invalid,'close');invalid.send(JSON.stringify({type:'start',rate:48000,configId:config.id}));invalid.send(pcm);invalid.send(JSON.stringify({type:'end',pcmHash:'wrong'}));await invalidClosed;assert.equal(lab.db.runs.at(-1).status,'error');assert.equal(lab.db.runs.at(-1).text,null);
  const cancelled=new WebSocket(url,{origin});await once(cancelled,'open');const first=once(cancelled,'message');cancelled.send(JSON.stringify({type:'start',rate:48000,configId:config.id}));const id=JSON.parse((await first)[0]).runId;const cancelledClosed=once(cancelled,'close');await post('/api/cancel',{id});await cancelledClosed;assert.equal(lab.db.runs.at(-1).status,'cancelled');
 }finally{lab.close();for(const s of provider.clients)s.terminate();await new Promise(r=>provider.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
