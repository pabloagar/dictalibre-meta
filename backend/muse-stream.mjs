import {WebSocket,WebSocketServer} from 'ws';
import {StreamResampler,pcmWav} from './stream-audio.mjs';
import {hash} from './lab-core.mjs';
import {SpeechTurns} from './speech-turns.mjs';

export function attachMuseStream(server,{getKey,getConfig,start,finish,endpoint='wss://api.meta.ai/v1/asr/realtime',allowRequest=null,maxClients=1,onAudio=null}){
  const cancellations=new Map();
  const wss=new WebSocketServer({noServer:true,maxPayload:65536,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/asr-stream')return;
    const origin=`http://127.0.0.1:${server.address().port}`;
    const allowed=allowRequest?allowRequest(req):req.headers.origin===origin&&req.headers.host===new URL(origin).host;
    if(!allowed||wss.clients.size>=maxClients){socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,client=>{wss.emit('connection',client);session(client,req);});
  });
  function session(client,req){
    let run,up,resampler,rate,done=false,ended=false,ack=false,endSent=false,verified=false,handshakeTimer,finalTimer;
    let pending=Buffer.alloc(0),sent=0,started=performance.now(),sendStart=null,endAt=null,endSentAt=null,previous='';
    const original=[],derived=[],events=[];const turns=new SpeechTurns();let segmentation='manual';
    const metrics={handshakeMs:null,firstPartialMs:null,endToFinalMs:null,endStreamToFinalMs:null,partialCount:0,revisionCount:0,duplicatePartialCount:0,maxBufferedAudioMs:0,resampleMs:0,providerAudioProcessedMs:null};
    const emit=m=>{if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify(m));};
    const timer=setInterval(tick,20);const timeout=setTimeout(()=>complete('timeout','Streaming agotó el tiempo disponible.'),210000);
    function complete(status,error,text=null){
      if(done)return;done=true;clearInterval(timer);clearTimeout(timeout);clearTimeout(handshakeTimer);clearTimeout(finalTimer);
      if(up&&up.readyState===WebSocket.CONNECTING)up.terminate();else up?.close();
      if(run){
        cancellations.delete(run.id);
        const result=finish(run,{status,error,text,original:original.length?pcmWav(Buffer.concat(original),rate):null,derived:derived.length?pcmWav(Buffer.concat(derived),24000):null,
          metrics:{...metrics,segmentation,segments:turns.snapshot(),segmentCount:turns.turns.length,duplicateSegmentFinals:turns.duplicateFinals,streamSessionMs:performance.now()-started,inputDurationMs:original.reduce((n,b)=>n+b.length,0)/rate/2*1000,sentAudioMs:sent/48,integrityVerified:verified},events});
        emit({type:'done',runId:run.id,status:result.status});
      }else emit({type:'error',message:error??'No se pudo iniciar streaming.'});
      client.close();
    }
    function tick(){
      if(done||!ack||!up||up.readyState!==WebSocket.OPEN)return;
      if(up.bufferedAmount>480000)return complete('error','Cola de envío demasiado grande.');
      if(pending.length){
        if(sendStart===null)sendStart=performance.now();
        // At most 80 ms per frame, paced against the same monotonic clock.
        if(sent/48>performance.now()-sendStart+20)return;
        const n=Math.min(3840,pending.length);up.send(pending.subarray(0,n));pending=pending.subarray(n);sent+=n;
      }else if(ended&&!endSent){endSent=true;endSentAt=performance.now();up.send(JSON.stringify({type:'endStream'}));finalTimer=setTimeout(()=>complete('timeout','Muse no entregó un final en 30 segundos.'),30000);}
    }
    client.on('message',(bytes,binary)=>{
      try{
        if(done)return;
        if(binary){
          if(!run||ended)throw Error('Audio fuera de una toma activa.');
          const n=original.reduce((n,b)=>n+b.length,0)+bytes.length;
          if(!bytes.length||bytes.length%2||n>rate*2*180)throw Error('Audio fuera del límite de 180 segundos.');
          onAudio?.(run,{durationMs:bytes.length/rate/2*1000});
          original.push(Buffer.from(bytes));const t=performance.now(),out=resampler.push(bytes);metrics.resampleMs+=performance.now()-t;
          derived.push(out);pending=Buffer.concat([pending,out]);metrics.maxBufferedAudioMs=Math.max(metrics.maxBufferedAudioMs,pending.length/48);
          if(pending.length>480000)throw Error('Retraso de streaming superior a diez segundos.');return;
        }
        const m=JSON.parse(bytes.toString());
        if(m.type==='cancel')return complete('cancelled','Streaming cancelado; el parcial no es un resultado final.');
        if(m.type==='start'&&!run){
          segmentation=m.segmentation??'manual';if(!['manual','automatic'].includes(segmentation))throw Error('Segmentación desconocida.');m.segmentation=segmentation;
          rate=m.rate;resampler=new StreamResampler(rate);const config=getConfig(m.configId),key=getKey();
          if(!config||config.engine!=='muse'||!key)throw Error('Muse requiere configuración y clave disponibles.');
          started=performance.now();run=start(config,m,req);cancellations.set(run.id,()=>complete('cancelled','Streaming cancelado.'));emit({type:'started',runId:run.id});
          up=new WebSocket(endpoint,{handshakeTimeout:10000,maxPayload:1024*1024});
          handshakeTimer=setTimeout(()=>complete('timeout','Muse no confirmó la conexión en diez segundos.'),10000);
          up.on('open',()=>up.send(JSON.stringify({authorization:{accessToken:`Bearer ${key}`},model:config.model,mode:segmentation==='automatic'?'ENDPOINTING':'PUSH_TO_TALK',audioEncoding:'PCM_24KHZ',partialMode:'CUMULATIVE',languageBias:['Spanish'],keywords:config.keywords,emitAudioProgress:true})));
          up.on('message',(data,isBinary)=>{
            if(done||isBinary)return;
            try{
              const e=JSON.parse(data.toString());
              if(!ack&&typeof e.sessionId==='string'&&!e.type){ack=true;clearTimeout(handshakeTimer);metrics.handshakeMs=performance.now()-started;emit({type:'ready'});return;}
              if(e.type==='error')return complete('error','Muse rechazó el streaming. Revisa acceso, cuota y formato.');
              if(Number.isFinite(e.audioProcessedMs))metrics.providerAudioProcessedMs=e.audioProcessedMs;
              if(segmentation==='automatic'){
                if(!['speechStart','speechEnd','speechComplete','transcript'].includes(e.type))return;
                const atMs=performance.now()-started;
                events.push({type:e.type,turnId:e.turnId??null,atMs,text:e.transcript??null,audioProcessedMs:e.audioProcessedMs??null});
                if(events.length>4000)return complete('error','Demasiados eventos en una toma.');
                const before=turns.current?.partial??'';turns.accept(e,atMs);
                if(e.type==='transcript'){
                  metrics.partialCount++;if(e.transcript&&metrics.firstPartialMs===null)metrics.firstPartialMs=atMs;
                  if(e.transcript===before)metrics.duplicatePartialCount++;else if(before&&!e.transcript.startsWith(before))metrics.revisionCount++;
                }
                emit({type:'segments',segments:turns.snapshot(),atMs});return;
              }
              if(e.type!=='transcript'||typeof e.transcript!=='string')return;
              const atMs=performance.now()-started;events.push({atMs,text:e.transcript,final:e.final===true,audioProcessedMs:e.audioProcessedMs??null});
              if(events.length>4000)return complete('error','Demasiados eventos en una toma.');
              if(e.final===true){
                if(!endSent||!verified)return complete('error','Final recibido antes de verificar y cerrar el audio.');
                metrics.endToFinalMs=performance.now()-endAt;metrics.endStreamToFinalMs=performance.now()-endSentAt;
                return complete('completed',null,e.transcript);
              }
              metrics.partialCount++;if(e.transcript&&metrics.firstPartialMs===null)metrics.firstPartialMs=atMs;
              if(e.transcript===previous)metrics.duplicatePartialCount++;else if(previous&&!e.transcript.startsWith(previous))metrics.revisionCount++;
              previous=e.transcript;emit({type:'partial',text:e.transcript,atMs});
            }catch{complete('error','Respuesta streaming inválida.');}
          });
          up.on('error',()=>complete('error','No se pudo conectar con Muse streaming.'));
          up.on('close',code=>{
            if(done)return;
            if(segmentation==='automatic'&&code===1000&&endSent&&verified&&turns.complete){
              metrics.endToFinalMs=performance.now()-endAt;metrics.endStreamToFinalMs=performance.now()-endSentAt;
              return complete('completed',null,turns.text);
            }
            complete('error',`Muse cerró sin completar la toma (código ${code}).`);
          });return;
        }
        if(m.type==='end'&&run&&!ended){
          endAt=performance.now();ended=true;
          const pcm=Buffer.concat(original);if(!pcm.length||hash(pcm)!==m.pcmHash)throw Error('La integridad del audio streaming no coincide.');verified=true;
          const t=performance.now(),tail=resampler.push(Buffer.alloc(0),true);metrics.resampleMs+=performance.now()-t;derived.push(tail);pending=Buffer.concat([pending,tail]);return;
        }
        throw Error('Mensaje de streaming inesperado.');
      }catch(e){complete('error',e.message);}
    });
    client.on('error',()=>complete('error','Conexión local interrumpida.'));
    client.on('close',()=>{if(!done)complete('interrupted','Página desconectada antes del resultado final.');});
  }
  const close=()=>{for(const cancel of cancellations.values())cancel();for(const c of wss.clients)c.terminate();wss.close();};
  close.cancel=id=>cancellations.get(id)?.();return close;
}
