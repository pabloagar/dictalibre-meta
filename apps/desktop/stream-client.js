export function startStream({rate,configId,commandsEnabled,reviewEnabled=false,reviewContext=null,segmentation='manual',onSegments,onPartial,onDraft}){
 const item={started:performance.now(),firstPartialMs:null,runId:null,error:null,pending:[],buffered:0,done:false};
 const ws=new WebSocket(`ws://${location.host}/asr-stream`);item.ws=ws;
 item.fail=message=>{item.error=message;onPartial(message);ws.close();};
 item.send=m=>{if(item.error)return;if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>1048576)return item.fail('Cola local de streaming demasiado grande.');ws.send(m);}else if(ws.readyState===WebSocket.CONNECTING){item.pending.push(m);item.buffered+=typeof m==='string'?m.length:m.byteLength;if(item.buffered>1048576)item.fail('Muse no conectó a tiempo.');}else item.fail('Streaming desconectado.');};
 ws.onopen=()=>{ws.send(JSON.stringify({type:'start',rate,configId,commandsEnabled,reviewEnabled,reviewContext,segmentation,numbersEnabled:true}));for(const m of item.pending)ws.send(m);item.pending=[];};
 ws.onmessage=e=>{
  const m=JSON.parse(e.data);
  if(m.type==='started')item.runId=m.runId;
  else if(m.type==='ready')onPartial('Escuchando · esperando primer borrador…');
  else if(m.type==='partial'){onDraft?.(m.text??'');onPartial(m.text||'Escuchando…');if(m.text&&item.firstPartialMs===null)item.firstPartialMs=performance.now()-item.started;}
  else if(m.type==='segments'){onSegments?.(m.segments);if(m.segments.some(t=>t.text||t.partial)&&item.firstPartialMs===null)item.firstPartialMs=performance.now()-item.started;}
  else if(m.type==='error')item.fail(m.message);
  else if(m.type==='done')item.done=true;
 };
 ws.onerror=()=>item.fail('No se pudo conectar con Muse streaming.');
 ws.onclose=()=>{if(!item.done&&!item.error){item.error='Streaming desconectado antes del resultado final.';onPartial(item.error);}};
 item.end=pcmHash=>item.send(JSON.stringify({type:'end',pcmHash}));
 item.cancel=()=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'cancel'}));ws.close();};
 return item;
}
