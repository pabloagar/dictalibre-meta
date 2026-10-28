// Synthetic protocol sender for a receiver session. Never accesses a microphone.
// Usage: node scripts/smoke-live.mjs <one-use QR token> <synthetic WAV path>
import fs from 'node:fs';
import WebSocket from 'ws';
import {encodeChunk} from '../apps/shared/protocol.js';
import {ClockCalibration,epochNow} from '../apps/shared/metrics.js';
import {wavInfo,hash} from '../backend/lab-core.mjs';
const demo=JSON.parse(fs.readFileSync('.runtime/demo.json','utf8').replace(/^\uFEFF/,''));
const bytes=fs.readFileSync(process.argv[3]),info=wavInfo(bytes);
if(info.channels!==1)throw Error('Fixture mono requerido.');
const pcm=bytes.subarray(info.offset,info.offset+info.bytes),calibration=new ClockCalibration();
const ws=new WebSocket(demo.url.replace('https:','wss:')+'/ws',{origin:demo.url});
const send=m=>ws.send(JSON.stringify(m));let keepAlive;const timeout=setTimeout(()=>{console.error('Smoke timeout');ws.close();process.exitCode=1;},120000);
ws.on('open',()=>send({type:'join_qr',token:process.argv[2]}));
ws.on('error',error=>{console.error(error.message);process.exitCode=1;});
ws.on('message',async data=>{
 const m=JSON.parse(data);
 if(m.type==='error')console.error(m.message);
 if(m.type==='pong')calibration.observe(m.echo,m.serverReceive,m.serverSend,epochNow());
 if(m.type==='paired'){
  keepAlive=setInterval(()=>send({type:'ping',echo:epochNow()}),5000);send({type:'ping',echo:epochNow()});
  await new Promise(r=>setTimeout(r,500));
  send({type:'start',id:1,rate:info.sampleRate,source:'tone',mode:'hold'});
  const samples=info.bytes/2,block=Math.floor(info.sampleRate/10);let seq=0;
  for(let i=0;i<samples;i+=block){const count=Math.min(block,samples-i),chunk=Int16Array.from({length:count},(_,j)=>pcm.readInt16LE((i+j)*2));send({type:'block_timing',id:1,sequence:seq,sent:calibration.stamp(),queueBytes:ws.bufferedAmount});ws.send(encodeChunk(1,seq++,chunk));await new Promise(r=>setTimeout(r,100));}
  send({type:'end',id:1,frames:seq,samples,hash:hash(pcm),stopStamp:calibration.stamp()});console.log('Fixture enviado: '+seq+' bloques.');
 }
 if(m.type==='verified')console.log('Integridad verificada por receptor.');
});
ws.on('close',()=>{clearInterval(keepAlive);clearTimeout(timeout);});
