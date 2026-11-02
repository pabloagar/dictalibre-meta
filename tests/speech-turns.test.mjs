import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {WebSocket,WebSocketServer} from 'ws';
import {SpeechTurns} from '../backend/speech-turns.mjs';
import {attachMuseStream} from '../backend/muse-stream.mjs';
import {hash} from '../backend/lab-core.mjs';

test('turnos solapados mantienen orden, reemplazan parciales y no duplican finales',()=>{
 const t=new SpeechTurns();
 t.accept({type:'speechStart',turnId:1},0);t.accept({type:'transcript',transcript:'dos'},1);t.accept({type:'transcript',transcript:'dos coma'},2);
 t.accept({type:'speechEnd',turnId:1},3);t.accept({type:'speechStart',turnId:2},4);
 t.accept({type:'speechComplete',turnId:2,transcript:'cinco centímetros'},5);assert.equal(t.complete,false);
 t.accept({type:'speechComplete',turnId:1,transcript:'dos coma'},6);t.accept({type:'speechComplete',turnId:1,transcript:'dos coma'},7);
 assert.equal(t.text,'dos coma cinco centímetros');assert.equal(t.complete,true);assert.equal(t.duplicateFinals,1);assert.equal(t.snapshot()[0].endToCompleteMs,3);
 assert.throws(()=>t.accept({type:'speechComplete',turnId:1,transcript:'otro'},8));
});

for(const scenario of ['success','missing-final','abnormal-close','early-close','bad-hash','silence'])test(`endpointing: ${scenario}`,{timeout:10000},async()=>{
 const provider=new WebSocketServer({port:0});await once(provider,'listening');
 provider.on('connection',s=>{let begun=false;s.on('message',(b,binary)=>{
  if(binary)return;const m=JSON.parse(b);
  const send=e=>s.send(JSON.stringify(e));
  if(!begun){begun=true;assert.equal(m.mode,'ENDPOINTING');send({sessionId:'test'});
   if(scenario!=='silence'){send({type:'speechStart',turnId:1});send({type:'transcript',transcript:'no se observan'});send({type:'speechEnd',turnId:1});send({type:'speechStart',turnId:2});send({type:'speechComplete',turnId:2,transcript:'adenopatías'});if(scenario!=='missing-final')send({type:'speechComplete',turnId:1,transcript:'no se observan'});}
   if(scenario==='early-close')s.close(1000);
  }else if(m.type==='endStream')s.close(scenario==='abnormal-close'?1011:1000);
 });});
 const server=http.createServer();let result;
 const close=attachMuseStream(server,{endpoint:`ws://127.0.0.1:${provider.address().port}`,getKey:()=> 'test',getConfig:()=>({engine:'muse',model:'test',keywords:[]}),start:()=>({id:'run'}),finish:(_,r)=>{result=r;return r;}});
 server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  const s=new WebSocket(origin.replace('http:','ws:')+'/asr-stream',{origin});await once(s,'open');const closed=once(s,'close');
  s.send(JSON.stringify({type:'start',rate:24000,segmentation:'automatic'}));const pcm=Buffer.alloc(4800);s.send(pcm);
  if(scenario!=='early-close')s.send(JSON.stringify({type:'end',pcmHash:scenario==='bad-hash'?'bad':hash(pcm)}));await closed;
  assert.equal(result.status,['success','silence'].includes(scenario)?'completed':'error');
  assert.equal(result.text,scenario==='success'?'no se observan adenopatías':scenario==='silence'?'':null);
  if(scenario==='success'){assert.equal(result.metrics.segmentCount,2);assert.equal(result.metrics.integrityVerified,true);assert.ok(result.metrics.endToFinalMs>=0);}
 }finally{close();await new Promise(r=>server.close(r));for(const s of provider.clients)s.terminate();await new Promise(r=>provider.close(r));}
});
