import {t as tr, language} from '../shared/i18n.js';
export function startStream({rate,configId,commandsEnabled,reviewEnabled=false,reviewContext=null,segmentation='manual',onSegments,onPartial,onDraft}){
 const item={started:performance.now(),firstPartialMs:null,runId:null,error:null,pending:[],buffered:0,done:false};
 const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/asr-stream`);item.ws=ws;
 item.fail=message=>{item.error=tr(message);onPartial(item.error);ws.close();};
 item.send=m=>{if(item.error)return;if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>1048576)return item.fail(tr('Cola local de streaming demasiado grande.'));ws.send(m);}else if(ws.readyState===WebSocket.CONNECTING){item.pending.push(m);item.buffered+=typeof m==='string'?m.length:m.byteLength;if(item.buffered>1048576)item.fail(tr('Muse no conectó a tiempo.'));}else item.fail(tr('Streaming desconectado.'));};
 ws.onopen=()=>{ws.send(JSON.stringify({type:'start',rate,configId,commandsEnabled,reviewEnabled,reviewContext,segmentation,numbersEnabled:true,termsEnabled:true}));for(const m of item.pending)ws.send(m);item.pending=[];};
 ws.onmessage=e=>{
  const m=JSON.parse(e.data);
  if(m.type==='started')item.runId=m.runId;
  else if(m.type==='ready')onPartial(tr('Escuchando · esperando primer borrador…'));
  else if(m.type==='partial'){onDraft?.(m.text??'');onPartial(m.text||tr('Escuchando…'));if(m.text&&item.firstPartialMs===null)item.firstPartialMs=performance.now()-item.started;}
  else if(m.type==='segments'){onSegments?.(m.segments);if(m.segments.some(t=>t.text||t.partial)&&item.firstPartialMs===null)item.firstPartialMs=performance.now()-item.started;}
  else if(m.type==='error')item.fail(m.message);
  else if(m.type==='done')item.done=true;
 };
 ws.onerror=()=>item.fail(tr('No se pudo conectar con Muse streaming.'));
 ws.onclose=()=>{if(!item.done&&!item.error){item.error=tr('Streaming desconectado antes del resultado final.');onPartial(item.error);}};
 item.end=pcmHash=>item.send(JSON.stringify({type:'end',pcmHash}));
 item.cancel=()=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'cancel'}));ws.close();};
 return item;
}

// Bounded in-memory FIFO: only one provider stream at a time.
export function createTakeQueue({maxBytes=64*1024*1024}={}){
 let tail=Promise.resolve(),bytes=0;
 return function reserve(){
  let release;const previous=tail;const completed=new Promise(resolve=>release=resolve);tail=previous.then(()=>completed);
  let closed=false,buffer=[],localBytes=0,inner=null;
  const slot={ready:previous,release(){if(closed)return;closed=true;bytes-=localBytes;localBytes=0;buffer=[];release();},
   open(factory){slot.opened=previous.then(()=>{if(closed)return;inner=factory();const pump=()=>{if(closed||!buffer.length)return;const m=buffer.shift(),size=typeof m==='string'?m.length*2:m.byteLength;bytes-=size;localBytes-=size;inner.send(m);if(buffer.length)setTimeout(pump,10);};pump();});return slot;},
   send(m){if(closed)return;if(inner&&!buffer.length){inner.send(m);return;}const size=typeof m==='string'?m.length*2:m.byteLength;if(bytes+size>maxBytes){slot.error=tr('Cola de audio llena. Conserva la toma recibida y vuelve a intentarlo.');slot.release();return;}buffer.push(m);localBytes+=size;bytes+=size;},
   end(hash){slot.send(JSON.stringify({type:'end',pcmHash:hash}));},
   cancel(){inner?.cancel();slot.release();},get started(){return inner?.started;},get runId(){return inner?.runId;},get done(){return inner?.done;},get firstPartialMs(){return inner?.firstPartialMs;},get error(){return slot.failure??inner?.error;},set error(value){slot.failure=value;}};
  return slot;
 };
}
