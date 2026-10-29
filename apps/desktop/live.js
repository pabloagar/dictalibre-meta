import {arrivalEstimate} from '/shared/metrics.js';
const panel=document.querySelector('.transcript-paper');
document.querySelector('header .tag').textContent='DICTADO · MUSE / WHISPER';
document.querySelector('footer').textContent='DICTA LIBRE · CAPTURA → MOTOR ELEGIDO → TEXTO';
for(const p of document.querySelectorAll('.diagnostics p'))if(p.textContent.startsWith('Por integrar:'))p.textContent='Whisper: cola, petición al motor, fin recibido → texto y parada → texto estimada se registran por toma. Streaming y sugerencias siguen pendientes.';
panel.replaceChildren();panel.setAttribute('aria-label','Transcripciones por toma');
const modelBadge=document.querySelector('.section-head .tag');
const engineLabel=document.createElement('label');engineLabel.textContent='Motor para la próxima toma ';const engineSelect=document.createElement('select');engineSelect.setAttribute('aria-label','Motor para dictar');engineSelect.add(new Option('Muse · Meta API','muse'));engineSelect.add(new Option('Whisper · GPU local','whisper'));engineLabel.append(engineSelect);panel.before(engineLabel);
const engineHint=document.createElement('p');engineHint.className='tiny';engineLabel.after(engineHint);
const initialState=await api('/api/state');
const commandsLabel=document.createElement('label'),commandsToggle=document.createElement('input');commandsToggle.type='checkbox';commandsToggle.checked=true;commandsLabel.append(commandsToggle,' Aplicar comandos de dictado');engineHint.after(commandsLabel);
const commandHelp=document.createElement('p');commandHelp.className='tiny';commandHelp.textContent='Punto · coma · dos puntos · punto y coma · nueva línea · nuevo párrafo. Se aplican al terminar la toma; original conservado. Desactiva para dictar literalmente.';commandsLabel.after(commandHelp);
engineSelect.value=initialState.metaConfigured?'muse':'whisper';
const updateEngine=()=>{modelBadge.textContent=engineSelect.value==='muse'?'MUSE · META API':'WHISPER LOCAL · GPU';engineHint.textContent=engineSelect.value==='muse'?'Cada toma completa se envía a Meta para transcribir. Usa la clave configurada en el laboratorio.':'El audio se transcribe en la GPU de este PC. La primera toma puede tardar mientras carga el modelo.';};
engineSelect.onchange=updateEngine;updateEngine();let recordingEngine=null;
window.addEventListener('dicta-recording-start',()=>{recordingEngine=engineSelect.value;engineSelect.disabled=true;commandsToggle.disabled=true;});
window.addEventListener('dicta-recording-stop',()=>{engineSelect.disabled=false;recordingEngine=null;commandsToggle.disabled=false;});
const notice=document.createElement('p');notice.className='live-notice';notice.textContent='Al terminar cada toma aparecerá su borrador. Audio y resultados se guardan en el laboratorio local. Revisa el texto antes de utilizarlo.';panel.append(notice);
const link=document.createElement('a');link.href='/';link.target='_blank';link.rel='noopener';link.textContent='Abrir laboratorio y comparar tomas';notice.append(document.createElement('br'),link);
const jobs=new Set();let generation=0;
const reportLabel=document.createElement('label');reportLabel.textContent='Informe de esta página · editable';const report=document.createElement('textarea');report.rows=7;report.setAttribute('aria-label','Informe dictado');report.className='dictation-report';report.placeholder='Dicta desde el celular. El texto y los saltos se añadirán aquí al terminar cada toma.';reportLabel.append(report);notice.after(reportLabel);
const reportHint=document.createElement('p');reportHint.className='tiny';reportHint.textContent='Las tomas y resultados se guardan en el laboratorio. Las ediciones de este informe permanecen solo en esta página.';reportLabel.after(reportHint);
let reportQueue=[];
function flushReport(){while(reportQueue[0]?.done){const item=reportQueue.shift();if(item.text!==undefined){let next=item.text.replace(/^[ \t]+/u,'');if(item.commandsEnabled&&/[.,;:]$/u.test(report.value.trimEnd())&&next[0]===report.value.trimEnd().at(-1))next=next.slice(1);const spacer=report.value&&!/\s$/u.test(report.value)&&next&&!/^[\s.,;:]/u.test(next)?' ':'';report.value+=spacer+next;}}}
const seconds=v=>v==null?'sin medición':`${(v/1000).toFixed(2)} s`;
async function api(path,data,signal){const response=await fetch(path,{signal,...(data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})});const value=await response.json();if(!response.ok)throw Error(value.error);return value;}
window.addEventListener('dicta-new-session',()=>{generation++;reportQueue=[];commandsToggle.disabled=false;engineSelect.disabled=false;recordingEngine=null;for(const job of jobs){job.controller.abort();if(job.runId)void api('/api/cancel',{id:job.runId}).catch(()=>{});}jobs.clear();for(const card of panel.querySelectorAll('article'))card.remove();});
window.addEventListener('dicta-take',async event=>{
 const take=event.detail,epoch=generation,controller=new AbortController(),job={controller,runId:null};jobs.add(job);
 const reportItem={done:false};reportQueue.push(reportItem);
 const engine=recordingEngine??engineSelect.value;recordingEngine=null;engineSelect.disabled=false;commandsToggle.disabled=false;const commandsEnabled=commandsToggle.checked;
 const card=document.createElement('article');card.className='clip';const title=document.createElement('strong');title.textContent=`Toma ${take.recordingId} · ${engine==='muse'?'Muse':'Whisper'}`;
 const text=document.createElement('p');text.className='live-transcript';text.textContent='Preparando transcripción…';text.setAttribute('role','status');
 const timing=document.createElement('p');timing.className='tiny';const cancel=document.createElement('button');cancel.textContent='Cancelar transcripción';cancel.className='quiet';cancel.onclick=()=>{controller.abort();if(job.runId)void api('/api/cancel',{id:job.runId}).catch(()=>{});};
 card.append(title,text,timing,cancel);panel.append(card);take.trace.asr={status:'queued',runId:null};
 try{
  const response=await fetch('/api/audio',{method:'POST',signal:controller.signal,headers:{'Content-Type':'audio/wav','X-File-Name':encodeURIComponent(`dictado-${Date.now()}-${take.recordingId}.wav`)},body:take.blob});
  const audio=await response.json();if(!response.ok)throw Error(audio.error);
  const compare=document.createElement('a');compare.href=`/?audio=${encodeURIComponent(audio.id)}&compare=both`;compare.target='_blank';compare.rel='noopener';compare.textContent='Toma guardada · comparar después con ambos motores';card.append(compare);
  const state=await api('/api/state',undefined,controller.signal),config=state.configs.find(c=>c.engine===engine&&(engine==='muse'?c.keywords.length===0:c.beams===1));
  if(!config)throw Error('No hay configuración base para el motor elegido.');
  if(engine==='muse'&&!state.metaConfigured)throw Error('Falta la clave de Meta: configúrala en el laboratorio.');
  // Keep this response observable even if cancellation races with enqueue.
  const queued=await api('/api/runs',{audioIds:[audio.id],configIds:[config.id],repeats:1,commandsEnabled});job.runId=queued.runIds[0];take.trace.asr.runId=job.runId;
  if(controller.signal.aborted){await api('/api/cancel',{id:job.runId});throw Error('Cancelado.');}
  const deadline=performance.now()+360000;
  while(performance.now()<deadline){
   const state=await api('/api/state',undefined,controller.signal),run=state.runs.find(r=>r.id===job.runId);
   if(epoch!==generation)return;
   if(run?.status==='completed'){
    const finalText=run.formatting?.text??run.text;
    text.textContent=finalText.trim()||(finalText.includes('\n')?'(Salto aplicado al informe.)':'(El motor devolvió texto vacío.)');
    reportItem.text=finalText;reportItem.commandsEnabled=commandsEnabled;reportItem.done=true;flushReport();
    const original=document.createElement('details'),summary=document.createElement('summary'),raw=document.createElement('pre');summary.textContent='Ver transcripción original y comandos';raw.textContent=run.text;original.append(summary,raw);
    const report=document.createElement('p');report.className='tiny';report.textContent=run.formatting?`${run.formatting.events.length} comandos aplicados · ${run.formatting.elapsedMs.toFixed(2)} ms · ${run.formatting.warnings.length} dudas conservadas sin convertir. ${run.formatting.warnings.map(w=>w.command+': posible uso literal o decimal').join('; ')}`:'Comandos desactivados para esta toma.';original.append(report);card.append(original);
    if(run.formatting?.warnings.length){const warning=document.createElement('p');warning.className='tiny';warning.textContent='Revisa las dudas de comandos: se conservaron palabras potencialmente literales o decimales.';card.append(warning);}
    // DOM update time, not a hardware measurement of screen presentation.
    const receiveEndToTextMs=performance.now()-take.receivedEnd;
    const estimate=arrivalEstimate(take.stopStamp,take.stamp());
    const stopToTextEstimateMs=estimate?.usable?estimate.ms:null,clockUncertaintyMs=estimate?.uncertaintyMs??null;
    take.trace.asr={status:'completed',runId:run.id,engine,uiRevision:'commands-live-v1',model:run.configuration.model,cold:run.result?.cold};
    for(const [key,value] of Object.entries({receiveEndToTextMs,stopToTextEstimateMs,clockUncertaintyMs,asrQueueMs:run.timings.queueMs,asrRunMs:run.timings.requestMs}))take.trace.stage(key,value);
    timing.textContent=`Detener → texto: ${stopToTextEstimateMs==null?'sin calibración':`≈ ${seconds(stopToTextEstimateMs)} (resolución orientativa ${seconds(clockUncertaintyMs)})`} · fin recibido en PC → texto: ${seconds(receiveEndToTextMs)} · cola: ${seconds(run.timings.queueMs)} · motor: ${seconds(run.timings.requestMs)}${run.result?.cold?' · primera carga del modelo':''}`;
    take.renderMetrics();
    try{await api('/api/live-measurements',{runId:run.id,recordingId:take.recordingId,source:take.trace.source,receiveEndToTextMs,stopToTextEstimateMs,clockUncertaintyMs});}catch{timing.textContent+=' · No se pudo guardar esta medición; exporta las métricas de sesión.';}
    return;
   }
   if(run&&!['queued','running'].includes(run.status))throw Error(run.error?.includes('Muse HTTP 401')?'Meta rechazó la autenticación (401). Revisa que sea una clave activa de Meta Model API y vuelve a pegarla en Acceso a Meta del laboratorio; no hace falta reiniciar.':run.error||run.status);
   text.textContent=run?.status==='running'?(engine==='muse'?'Transcribiendo con Muse en Meta…':'Transcribiendo en tu GPU… La primera toma puede tardar mientras carga el modelo.'):'Esperando turno de transcripción…';
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  await api('/api/cancel',{id:job.runId});throw Error('Tiempo de espera agotado.');
 }catch(error){if(epoch===generation){text.textContent=controller.signal.aborted?'Transcripción cancelada.':`No se pudo transcribir: ${error.message}`;take.trace.asr={status:controller.signal.aborted?'cancelled':'error',runId:job.runId,engine,uiRevision:'commands-live-v1'};timing.textContent=`Fin recibido en PC → error/cancelación: ${seconds(performance.now()-take.receivedEnd)}`;take.renderMetrics();}}
 finally{reportItem.done=true;if(epoch===generation)flushReport();jobs.delete(job);cancel.remove();while(panel.querySelectorAll('article').length>5){const old=panel.querySelector('article');if(old.querySelector('button'))break;old.remove();}}
});
