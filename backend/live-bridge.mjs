import fs from 'node:fs';
import path from 'node:path';
import {WebSocketServer,WebSocket} from 'ws';
export function demoConnection(root){
 const state=JSON.parse(fs.readFileSync(path.join(root,'.runtime','demo.json'),'utf8').replace(/^\uFEFF/,''));
 const origin=new URL(state.url);if(origin.protocol!=='https:'||!Number.isInteger(state.port)||state.port<1||state.port>65535)throw Error('Configuración de demo inválida.');
 return {origin:origin.origin,target:`ws://127.0.0.1:${state.port}/ws`};
}
export function attachLiveBridge(server,connection){
 const wss=new WebSocketServer({noServer:true,maxPayload:32768,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  if(req.url==='/asr-stream')return;
  const origin=`http://127.0.0.1:${server.address().port}`;
  if(req.url!=='/ws'||req.headers.origin!==origin||req.headers.host!==new URL(origin).host||wss.clients.size>=3){socket.destroy();return;}
  let config;try{config=connection();}catch{socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,client=>{
   wss.emit('connection',client,req);
   const upstream=new WebSocket(config.target,{origin:config.origin,maxPayload:32768});const pending=[];
   const stop=()=>{client.close();upstream.close();};
   const timer=setTimeout(stop,10000);
   upstream.on('open',()=>{clearTimeout(timer);for(const [data,binary] of pending)upstream.send(data,{binary});pending.length=0;});
   client.on('message',(data,binary)=>{if(upstream.readyState===WebSocket.OPEN){if(upstream.bufferedAmount>1048576)return stop();upstream.send(data,{binary});}else if(upstream.readyState===WebSocket.CONNECTING&&pending.length<10)pending.push([data,binary]);else stop();});
   upstream.on('message',(data,binary)=>{if(client.readyState===WebSocket.OPEN){if(client.bufferedAmount>1048576)return stop();client.send(data,{binary});}});
   for(const peer of [client,upstream]){peer.on('error',stop);peer.on('close',()=>{clearTimeout(timer);stop();});}
  });
 });
 return ()=>{for(const client of wss.clients)client.terminate();wss.close();};
}
