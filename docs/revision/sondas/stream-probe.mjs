import http from 'node:http';import {once} from 'node:events';import {WebSocket,WebSocketServer} from '../../../node_modules/ws/wrapper.mjs';
import {attachMuseStream} from '../../../backend/muse-stream.mjs';import {hash} from '../../../backend/lab-core.mjs';
async function scenario(name,onEnd,{second=false}={}){
 const provider=new WebSocketServer({port:0});await once(provider,'listening');
 provider.on('connection',s=>{let begun=false;s.on('message',(b,bin)=>{if(bin)return;const m=JSON.parse(b);const send=e=>s.send(JSON.stringify(e));
  if(!begun){begun=true;send({sessionId:'x'});if(name==='provider-error')send({type:'error',code:'QUOTA_EXCEEDED',message:'detalle'});}
  else if(m.type==='endStream')onEnd(send,s);});});
 const server=http.createServer();let result=null;
 const close=attachMuseStream(server,{endpoint:`ws://127.0.0.1:${provider.address().port}`,getKey:()=>'k',getConfig:()=>({engine:'muse',model:'m',keywords:[]}),start:()=>({id:'run'}),finish:(_,r)=>{result=r;return r;}});
 server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`;const url=origin.replace('http:','ws:')+'/asr-stream';
 const out={name};
 try{const s=new WebSocket(url,{origin});await once(s,'open');const closed=once(s,'close');
  s.send(JSON.stringify({type:'start',rate:24000}));const pcm=Buffer.alloc(4800);s.send(pcm);
  if(second){const s2=new WebSocket(url,{origin});const ev=await Promise.race([once(s2,'open').then(()=>'open'),once(s2,'error').then(([e])=>'error:'+e.message)]);out.secondConnection=ev;}
  await new Promise(r=>setTimeout(r,200));s.send(JSON.stringify({type:'end',pcmHash:hash(pcm)}));
  await Promise.race([closed,new Promise(r=>setTimeout(r,3000))]);
  out.status=result?.status;out.text=result?.text;out.error=result?.error;out.events=result?.events?.length;
 }finally{close();await new Promise(r=>server.close(r));for(const c of provider.clients)c.terminate();await new Promise(r=>provider.close(r));}
 console.log(JSON.stringify(out));}
await scenario('empty-final',send=>send({type:'transcript',transcript:'',final:true}));
await scenario('two-finals',send=>{send({type:'transcript',transcript:'nódulo de tres milímetros',final:true});send({type:'transcript',transcript:'en el lóbulo superior derecho',final:true});});
await scenario('provider-error',()=>{});
await scenario('close-1000-no-final',(send,s)=>s.close(1000));
await scenario('concurrent-second-stream',send=>send({type:'transcript',transcript:'ok',final:true}),{second:true});
