import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import WebSocket from 'ws';
import {createRelay} from '../backend/server.mjs';
import {attachLiveBridge} from '../backend/live-bridge.mjs';
test('puente local: emparejamiento real por relay y rechazo de origen externo',async()=>{
 const relay=createRelay({publicOrigin:'https://dicta.example'});relay.server.listen(0,'127.0.0.1');await once(relay.server,'listening');
 const server=http.createServer(),stop=attachLiveBridge(server,()=>({origin:'https://dicta.example',target:`ws://127.0.0.1:${relay.server.address().port}/ws`}));server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`,pc=new WebSocket(origin.replace('http:','ws:')+'/ws',{origin});let phone;
 try{
  await once(pc,'open');const created=once(pc,'message');pc.send(JSON.stringify({type:'create'}));const info=JSON.parse((await created)[0]);assert.equal(info.type,'created');
  phone=new WebSocket(`ws://127.0.0.1:${relay.server.address().port}/ws`,{origin:'https://dicta.example'});await once(phone,'open');
  const paired=once(pc,'message');phone.send(JSON.stringify({type:'join_qr',token:info.token}));assert.equal(JSON.parse((await paired)[0]).type,'paired');
  const bad=new WebSocket(origin.replace('http:','ws:')+'/ws',{origin:'https://other.example'});assert.ok((await once(bad,'error'))[0]);
 }finally{pc.terminate();phone?.terminate();stop();await new Promise(r=>server.close(r));await relay.close();}
});
