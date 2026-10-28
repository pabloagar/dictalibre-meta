import {arrivalEstimate} from '/shared/metrics.js';
const panel=document.querySelector('.transcript-paper');
document.querySelector('header .tag').textContent='DICTADO · WHISPER LOCAL';
document.querySelector('footer').textContent='DICTA LIBRE · CAPTURA → WHISPER → TEXTO';
for(const p of document.querySelectorAll('.diagnostics p'))if(p.textContent.startsWith('Por integrar:'))p.textContent='Whisper: cola, petición al motor, fin recibido → texto y parada → texto estimada se registran por toma. Streaming y sugerencias siguen pendientes.';
panel.replaceChildren();panel.setAttribute('aria-label','Transcripciones por toma');
document.querySelector('.section-head .tag').textContent='WHISPER LOCAL · GPU';
const notice=document.createElement('p');notice.className='live-notice';notice.textContent='Al terminar cada toma aparecerá su borrador. Audio y resultados se guardan en el laboratorio local. Revisa el texto antes de utilizarlo.';panel.append(notice);
const link=document.createElement('a');link.href='/';link.textContent='Abrir laboratorio y comparar tomas';notice.append(document.createElement('br'),link);
const jobs=new Set();let generation=0;
const seconds=v=>v==null?'sin medición':`${(v/1000).toFixed(2)} s`;
async function api(path,data,signal){const response=await fetch(path,{signal,...(data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})});const value=await response.json();if(!response.ok)throw Error(value.error);return value;}
window.addEventListener('dicta-new-session',()=>{generation++;for(const job of jobs){job.controller.abort();if(job.runId)void api('/api/cancel',{id:job.runId}).catch(()=>{});}jobs.clear();for(const card of panel.querySelectorAll('article'))card.remove();});
window.addEventListener('dicta-take',async event=>{
 const take=event.detail,epoch=generation,controller=new AbortController(),job={controller,runId:null};jobs.add(job);
 const card=document.createElement('article');card.className='clip';const title=document.createElement('strong');title.textContent=`Toma ${take.recordingId} · Whisper`;
 const text=document.createElement('p');text.className='live-transcript';text.textContent='Preparando transcripción…';text.setAttribute('role','status');
 const timing=document.createElement('p');timing.className='tiny';const cancel=document.createElement('button');cancel.textContent='Cancelar transcripción';cancel.className='quiet';cancel.onclick=()=>{controller.abort();if(job.runId)void api('/api/cancel',{id:job.runId}).catch(()=>{});};
 card.append(title,text,timing,cancel);panel.append(card);take.trace.asr={status:'queued',runId:null};
 try{
  const response=await fetch('/api/audio',{method:'POST',signal:controller.signal,headers:{'Content-Type':'audio/wav','X-File-Name':encodeURIComponent(`dictado-${Date.now()}-${take.recordingId}.wav`)},body:take.blob});
  const audio=await response.json();if(!response.ok)throw Error(audio.error);
  const state=await api('/api/state',undefined,controller.signal),config=state.configs.find(c=>c.engine==='whisper'&&c.beams===1);
  if(!config)throw Error('No hay configuración Whisper base.');
  // Keep this response observable even if cancellation races with enqueue.
  const queued=await api('/api/runs',{audioIds:[audio.id],configIds:[config.id],repeats:1});job.runId=queued.runIds[0];take.trace.asr.runId=job.runId;
  if(controller.signal.aborted){await api('/api/cancel',{id:job.runId});throw Error('Cancelado.');}
  const deadline=performance.now()+360000;
  while(performance.now()<deadline){
   const state=await api('/api/state',undefined,controller.signal),run=state.runs.find(r=>r.id===job.runId);
   if(epoch!==generation)return;
   if(run?.status==='completed'){
    text.textContent=run.text.trim()||'(El motor devolvió texto vacío.)';
    // DOM update time, not a hardware measurement of screen presentation.
    const receiveEndToTextMs=performance.now()-take.receivedEnd;
    const estimate=arrivalEstimate(take.stopStamp,take.stamp());
    const stopToTextEstimateMs=estimate?.usable?estimate.ms:null,clockUncertaintyMs=estimate?.uncertaintyMs??null;
    take.trace.asr={status:'completed',runId:run.id,model:run.configuration.model,cold:run.result?.cold};
    for(const [key,value] of Object.entries({receiveEndToTextMs,stopToTextEstimateMs,clockUncertaintyMs,asrQueueMs:run.timings.queueMs,asrRunMs:run.timings.requestMs}))take.trace.stage(key,value);
    timing.textContent=`Detener → texto: ${stopToTextEstimateMs==null?'sin calibración':`≈ ${seconds(stopToTextEstimateMs)} (resolución orientativa ${seconds(clockUncertaintyMs)})`} · fin recibido en PC → texto: ${seconds(receiveEndToTextMs)} · cola: ${seconds(run.timings.queueMs)} · motor: ${seconds(run.timings.requestMs)}${run.result?.cold?' · primera carga del modelo':''}`;
    take.renderMetrics();
    try{await api('/api/live-measurements',{runId:run.id,recordingId:take.recordingId,source:take.trace.source,receiveEndToTextMs,stopToTextEstimateMs,clockUncertaintyMs});}catch{timing.textContent+=' · No se pudo guardar esta medición; exporta las métricas de sesión.';}
    return;
   }
   if(run&&!['queued','running'].includes(run.status))throw Error(run.error||run.status);
   text.textContent=run?.status==='running'?'Transcribiendo en tu GPU… La primera toma puede tardar mientras carga el modelo.':'Esperando turno de transcripción…';
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  await api('/api/cancel',{id:job.runId});throw Error('Tiempo de espera agotado.');
 }catch(error){if(epoch===generation){text.textContent=controller.signal.aborted?'Transcripción cancelada.':`No se pudo transcribir: ${error.message}`;take.trace.asr={status:controller.signal.aborted?'cancelled':'error',runId:job.runId};take.renderMetrics();}}
 finally{jobs.delete(job);cancel.remove();while(panel.querySelectorAll('article').length>5){const old=panel.querySelector('article');if(old.querySelector('button'))break;old.remove();}}
});
