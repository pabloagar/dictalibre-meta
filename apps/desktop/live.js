import {textIntervals} from '/shared/lab-timing.js';
import {mountReport} from '/report-editor.js';
import {mountReview,sharedState,trimTakeCards} from '/review-ui.js';
import {arrivalEstimate} from '/shared/metrics.js';
import {startStream} from '/stream-client.js';
const panel=document.querySelector('.transcript-paper');
document.querySelector('header .tag').textContent='DICTADO · MUSE / WHISPER';
document.querySelector('footer').textContent='DICTA LIBRE · CAPTURA → MOTOR ELEGIDO → TEXTO';
for(const p of document.querySelectorAll('.diagnostics p'))if(p.textContent.startsWith('Por integrar:'))p.textContent='Por toma: cola y procesamiento. Streaming: conexión, primer borrador, revisiones y final. Revisor Meta opcional con aprobación humana.';
panel.replaceChildren();panel.setAttribute('aria-label','Transcripciones por toma');
const modelBadge=document.querySelector('.section-head .tag');
const engineLabel=document.createElement('label');engineLabel.textContent='Motor para la próxima toma ';const engineSelect=document.createElement('select');engineSelect.setAttribute('aria-label','Motor para dictar');engineSelect.add(new Option('Muse-Normal','muse'));engineSelect.add(new Option('Whisper local','whisper'));engineLabel.append(engineSelect);panel.before(engineLabel);
const engineHint=document.createElement('p');engineHint.className='tiny';engineLabel.after(engineHint);
const reviewLabel=document.createElement('label'),reviewToggle=document.createElement('input');reviewToggle.type='checkbox';reviewToggle.checked=true;reviewLabel.append(reviewToggle,' Revisor Meta al terminar cada toma (envía toma, contexto del informe y plantilla a Meta)');engineLabel.after(reviewLabel);
const initialState=await api('/api/state');
const isDemo=initialState.demo===true;
engineSelect.add(new Option('Muse-streaming','muse-stream'));
const glossaryLabel=document.createElement('label'),glossary=document.createElement('select');glossary.setAttribute('aria-label','Glosario de Muse');
for(const c of initialState.configs.filter(c=>c.engine==='muse'))glossary.add(new Option(c.keywords.length?`${c.name} · ${c.keywords.length} términos`:'Sin glosario',c.id));
glossaryLabel.append('Configuración de Muse ',glossary);engineLabel.after(glossaryLabel);
const segmentationLabel=document.createElement('label'),segmentationSelect=document.createElement('select');segmentationSelect.setAttribute('aria-label','Segmentación de Muse-streaming');segmentationSelect.add(new Option('Cierre manual','manual'));segmentationSelect.add(new Option('Segmentación automática · prueba','automatic'));segmentationLabel.append('Muse-streaming: ',segmentationSelect);glossaryLabel.after(segmentationLabel);
const commandsLabel=document.createElement('label'),commandsToggle=document.createElement('input');commandsToggle.type='checkbox';commandsToggle.checked=true;commandsLabel.append(commandsToggle,' Aplicar comandos de dictado');engineHint.after(commandsLabel);
const segmentHelp=document.createElement('p');segmentHelp.className='tiny';segmentHelp.textContent='Automática: las pausas pueden consolidar segmentos; el micrófono sigue activo hasta detener. No crean párrafos. Números/comandos se aplican al final de la toma. Máximo 3 minutos.';segmentationLabel.append(segmentHelp);
const commandHelp=document.createElement('p');commandHelp.className='tiny';commandHelp.textContent='Punto · coma · dos puntos · punto y coma · nueva línea · nuevo párrafo. Se aplican al terminar la toma; original conservado. Desactiva para dictar comandos literalmente. Las cantidades se muestran en cifras, conservando el original.';commandsLabel.after(commandHelp);
engineSelect.value=initialState.metaConfigured?'muse-stream':'whisper';
if(isDemo){engineSelect.replaceChildren(new Option('Muse-streaming','muse-stream'));engineSelect.value='muse-stream';reviewToggle.checked=false;reviewLabel.hidden=true;}
const updateEngine=()=>{segmentationLabel.hidden=engineSelect.value!=='muse-stream';glossaryLabel.hidden=engineSelect.value==='whisper';modelBadge.textContent=engineSelect.value==='muse-stream'?'MUSE · STREAMING':engineSelect.value==='muse'?'MUSE · POR TOMA':'WHISPER LOCAL · GPU';engineHint.textContent=engineSelect.value==='muse-stream'?'El audio se envía a Meta mientras hablas. El borrador puede cambiar; números y comandos se aplican al final. Espera el resultado final antes de otra toma.':engineSelect.value==='muse'?'Cada toma completa se envía a Meta para transcribir. Usa la clave configurada en el laboratorio.':'El audio se transcribe en la GPU de este PC. La primera toma puede tardar mientras carga el modelo.';};
engineSelect.onchange=updateEngine;updateEngine();let recordingEngine=null;
let stream=null,recordingConfig=null,recordingReview=true,recordingAnchor=null,recordingContext=null;const streams=new Set();
window.addEventListener('dicta-recording-start',e=>{
 recordingContext=reportEditor.context();recordingAnchor=crypto.randomUUID();reportEditor.begin(recordingAnchor);
 recordingReview=reviewToggle.checked;reviewToggle.disabled=true;recordingEngine=engineSelect.value;recordingConfig=glossary.value;engineSelect.disabled=true;commandsToggle.disabled=true;glossary.disabled=true;segmentationSelect.disabled=true;
 if(recordingEngine==='muse-stream'){
  const anchor=recordingAnchor;
  const card=document.createElement('article');card.className='clip';card.dataset.pending='true';const title=document.createElement('strong');title.textContent=`Toma ${e.detail.id} · Muse-streaming · BORRADOR`;
  const partial=document.createElement('p');partial.className='live-transcript';partial.setAttribute('role','status');partial.textContent='Conectando con Muse…';card.append(title,partial);panel.append(card);
  stream=startStream({rate:e.detail.rate,configId:recordingConfig,commandsEnabled:commandsToggle.checked,reviewEnabled:recordingReview,reviewContext:recordingContext,segmentation:segmentationSelect.value,onPartial:t=>{partial.textContent=t;},onDraft:t=>reportEditor.preview(anchor,t),onSegments:segments=>{reportEditor.preview(anchor,segments.map(s=>s.text??s.partial??'').filter(Boolean).join(' '));partial.replaceChildren();for(const segment of segments){const row=document.createElement('div');const label=document.createElement('small');label.textContent=segment.text===null?'Borrador · ':'Consolidado por Muse · ';row.append(label,document.createTextNode(segment.text??segment.partial??''));partial.append(row);}title.textContent=`Toma ${e.detail.id} · Muse-streaming · ${segments.filter(t=>t.text!==null).length} segmentos consolidados · micrófono activo`;}});stream.card=card;streams.add(stream);
 }
});
window.addEventListener('dicta-pcm',e=>stream?.send(e.detail.bytes));
window.addEventListener('dicta-recording-abort',()=>{stream?.cancel();stream=null;reportEditor.cancel(recordingAnchor);recordingAnchor=null;});
window.addEventListener('dicta-recording-stop',()=>{engineSelect.disabled=false;reviewToggle.disabled=false;recordingEngine=null;commandsToggle.disabled=false;glossary.disabled=false;segmentationSelect.disabled=false;});
const notice=document.createElement('p');notice.className='live-notice';notice.textContent='Por toma: texto al terminar. Streaming: borrador mientras hablas y texto final al detener. Audio y resultados se guardan en el laboratorio local.';panel.append(notice);
if(isDemo)notice.textContent='Demostración: borrador mientras hablas y texto final al detener. El audio se envía a Meta y este servidor no lo guarda.';
else{const link=document.createElement('a');link.href='/';link.target='_blank';link.rel='noopener';link.textContent='Abrir laboratorio y comparar tomas';notice.append(document.createElement('br'),link);}
const jobs=new Set();let generation=0;
const reportEditor=mountReport(panel,{build:initialState.build,sourceHash:initialState.sourceHash,globalReview:!isDemo});
const figureAlert=document.createElement('div');figureAlert.className='figure-alert';figureAlert.setAttribute('role','alert');figureAlert.hidden=true;reportEditor.element.before(figureAlert);
function showFigureDoubts(warnings){
 const doubts=warnings.filter(w=>w.reason==='possible_sentence_boundary');
 figureAlert.replaceChildren();figureAlert.hidden=!doubts.length;if(!doubts.length)return;
 const message=document.createElement('span');message.textContent=`Confirma ${doubts.length===1?'la cifra':'las cifras'}: ${doubts.map(w=>`«${w.spoken}» se escribió «${w.replacement}»`).join('; ')}. Si eran dos frases, corrígelo en el informe.`;
 const ok=document.createElement('button');ok.type='button';ok.textContent='Entendido';ok.onclick=()=>{figureAlert.hidden=true;};figureAlert.append(message,ok);
}
// Hoja clínica: preserve the mounted editor, transport controls and listeners.
document.body.classList.add('live-workspace','clinical-workspace');
const layoutMetrics={version:'a-compacta-v1',serverBuild:initialState.build??null,serverSourceHash:initialState.sourceHash??null,createdAt:new Date().toISOString(),browser:navigator.userAgent,device:null,network:null,audioSource:null,clockResolutionMs:null,instrumentationOverheadMs:null,audioMeter:{updates:0,totalPaintMs:0,maxPaintMs:0,source:'received-pcm-rms'},events:[]};
const track=(type,data={})=>{layoutMetrics.events.push({type,atMs:performance.now(),...data});if(layoutMetrics.events.length>500)layoutMetrics.events.shift();};
const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
const makeDetails=(label,cls)=>{const d=make('details',cls);d.append(make('summary','',label));return d;};
const report=reportEditor.element.closest('.report-workspace'),controls=report.querySelector('.report-controls');
const header=document.querySelector('header');header.replaceChildren();
const brand=make('div','clinical-brand','Dicta Libre');brand.append(make('small','','prototipo · solo material sintético'));header.append(brand,controls);
const templatePanel=report.querySelector('.template-library-panel')??controls.querySelector('.template-library-panel');
const sex=make('div','sex-control');sex.setAttribute('role','group');sex.setAttribute('aria-label','Sexo del estudio');sex.append(make('span','','Sexo'));let selectedSex='—';
for(const value of ['F','M','—']){const button=make('button','',value);button.setAttribute('aria-pressed',String(value===selectedSex));button.onclick=()=>{selectedSex=value;for(const b of sex.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));sheetSex.textContent='Sexo '+value;track('study-sex',{value});};sex.append(button);}
templatePanel.after(sex);
reportEditor.element.addEventListener('template-applied',()=>{selectedSex='—';sheetSex.textContent='Sexo —';for(const b of sex.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.textContent==='—'));});
const connection=makeDetails('Conecta tu teléfono para empezar','connection-panel'),pairing=document.querySelector('.pairing');connection.append(pairing);
const connectButton=pairing.querySelector('#create');connectButton.textContent='Mostrar QR';
const strip=document.querySelector('.record-strip');strip.classList.add('clinical-record');
sex.after(connection,strip);connection.addEventListener('toggle',()=>{if(connection.open&&document.querySelector('#paired').hidden&&document.querySelector('#pairing').hidden&&document.querySelector('#confirm-panel').hidden&&!connectButton.disabled)connectButton.click();});
const syncConnection=()=>{const connected=!document.querySelector('#paired').hidden;connection.querySelector('summary').textContent=connected?'Teléfono conectado':'Conecta tu teléfono para empezar';if(connected)connection.open=false;};
new MutationObserver(syncConnection).observe(document.querySelector('#paired'),{attributes:true,attributeFilter:['hidden']});syncConnection();
const settings=makeDetails('Ajustes','clinical-settings');const editbar=make('div','clinical-editbar');editbar.setAttribute('role','toolbar');editbar.setAttribute('aria-label','Edición del informe');report.prepend(editbar);editbar.append(controls.querySelector('.report-undo'),controls.querySelector('.report-redo'));
const settingsBody=make('div','settings-body');settings.append(settingsBody);settingsBody.append(engineLabel,glossaryLabel,segmentationLabel,reviewLabel,commandsLabel,engineHint,commandHelp);
const sizeControls=make('div','size-controls','Texto ');sizeControls.append(controls.querySelector('[aria-label="Reducir tamaño del informe"]'),controls.querySelector('.report-font-value'),controls.querySelector('[aria-label="Aumentar tamaño del informe"]'));editbar.append(sizeControls,settings);
let theme='dia';try{const saved=localStorage.getItem('dicta-theme-v1');if(['sala','dia'].includes(saved))theme=saved;}catch{}
const themeButton=make('button','theme-toggle');const applyTheme=()=>{document.body.dataset.theme=theme;themeButton.textContent=theme==='sala'?'Tema: Sala · cambiar a Día':'Tema: Día · cambiar a Sala';};applyTheme();
themeButton.onclick=()=>{theme=theme==='sala'?'dia':'sala';applyTheme();try{localStorage.setItem('dicta-theme-v1',theme);}catch{}track('theme',{theme});};settingsBody.append(themeButton);
if(!isDemo){const link=make('a','','Abrir laboratorio');link.href='/';link.target='_blank';link.rel='noopener';settingsBody.append(link);}
const takes=makeDetails('Tomas y Revisor Meta · últimas 5','takes-panel');takes.append(panel);
const diagnostics=document.querySelector('.diagnostics');diagnostics.prepend(document.querySelector('.live-metrics'));diagnostics.append(report.querySelector('.editor-export'));
settingsBody.append(takes,document.querySelector('#recordings').closest('details'),diagnostics);
const transcript=document.querySelector('.transcript');document.querySelector('.section-head').remove();
const desk=make('div','clinical-desk'),sheet=make('div','clinical-sheet'),sheetHead=make('div','sheet-head');
const sheetSex=make('span','','Sexo —');sheetHead.append(make('span','','Informe radiológico · documento en curso'),sheetSex);
reportEditor.element.before(desk);desk.append(sheet);sheet.append(sheetHead,reportEditor.element);
const margin=make('aside','clinical-notes');margin.setAttribute('aria-label','Notas del estudio');desk.append(margin);
const connectionNote=make('section','clinical-note neutral');connectionNote.append(make('h2','','DICTADO'),document.querySelector('#record-help'));settingsBody.append(connectionNote);
const glossaryNote=make('section','clinical-note neutral');glossaryNote.append(make('h2','','GLOSARIO DE ESTE ESTUDIO'));const glossaryText=make('p','');const glossaryChange=make('button','','Cambiar');glossaryChange.onclick=()=>{settings.open=true;glossary.focus();};glossaryNote.append(glossaryText,glossaryChange);settingsBody.append(glossaryNote);
const syncGlossary=()=>{const c=initialState.configs.find(c=>c.id===glossary.value);glossaryText.textContent=engineSelect.value==='whisper'?'Whisper local · no utiliza este glosario.':c?.keywords?.length?`${c.name} · ${c.keywords.length} términos. Mejora de reconocimiento sin medir.`:'Sin glosario. Puedes elegir uno en Ajustes.';};syncGlossary();glossary.addEventListener('change',syncGlossary);engineSelect.addEventListener('change',syncGlossary);
margin.append(figureAlert);
const note=make('section','clinical-note editing-note');note.append(make('h2','','TU INFORME'),make('p','','Empieza a dictar o escribe en la hoja. Usa Plantilla cuando quieras partir de una estructura.'));settingsBody.append(note);
const help=report.querySelector('.report-help');const editorHelp=makeDetails('Ayuda del editor','editor-help');editorHelp.append(help);settingsBody.append(editorHelp);
const status=document.querySelector('#status');status.classList.add('clinical-status');editbar.after(status);
margin.append(reportEditor.reviewPanel);
const level=document.querySelector('#level'),bars=make('span','audio-bars');bars.setAttribute('aria-hidden','true');for(let i=0;i<9;i++)bars.append(make('i',''));level.after(bars);
const paintLevel=()=>{const paintStart=performance.now();const value=Math.max(0,Math.min(1,Number(level.value)||0));for(const [i,bar] of [...bars.children].entries()){const lit=value>(i+1)/12;bar.style.height=(3+(lit?value*(13-Math.abs(i-4)):0))+'px';bar.classList.toggle('lit',lit);}const elapsed=performance.now()-paintStart;layoutMetrics.audioMeter.updates++;layoutMetrics.audioMeter.totalPaintMs+=elapsed;layoutMetrics.audioMeter.maxPaintMs=Math.max(layoutMetrics.audioMeter.maxPaintMs,elapsed);};new MutationObserver(paintLevel).observe(level,{attributes:true,attributeFilter:['value']});paintLevel();
const layoutExport=make('button','','Exportar mediciones de disposición');diagnostics.append(layoutExport);layoutExport.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(layoutMetrics,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='dicta-disposicion-metricas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
for(const [name,element] of [['connection',connection],['settings',settings],['templates',templatePanel],['takes-review',takes],['diagnostics',diagnostics]])element.addEventListener('toggle',()=>track('panel-toggle',{panel:name,open:element.open}));
for(const popup of [connection,settings,templatePanel])popup.addEventListener('toggle',()=>{if(popup.open)for(const other of [connection,settings,templatePanel])if(other!==popup)other.open=false;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const popup of [connection,settings,templatePanel])if(popup.open){popup.open=false;popup.querySelector('summary').focus();}});
let lastScroll=0;reportEditor.element.addEventListener('scroll',()=>{const now=performance.now();if(now-lastScroll>200){track('editor-scroll');lastScroll=now;}},{passive:true});
requestAnimationFrame(()=>{const r=reportEditor.element.getBoundingClientRect();track('editor-visible',{viewportWidth:innerWidth,viewportHeight:innerHeight,top:r.top,width:r.width,height:r.height,visibleHeight:Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(0,r.top)),initialCharacters:reportEditor.model.text.length});});
 const seconds=v=>v==null?'sin medición':`${(v/1000).toFixed(2)} s`;
async function api(path,data,signal){if(path==='/api/state'&&data===undefined)return sharedState();const response=await fetch(path,{signal,...(data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})});const value=await response.json();if(!response.ok)throw Error(value.error);return value;}
window.addEventListener('dicta-new-session',()=>{generation++;if(recordingAnchor)reportEditor.cancel(recordingAnchor);for(const job of jobs)if(job.anchor)reportEditor.cancel(job.anchor);recordingAnchor=null;commandsToggle.disabled=false;engineSelect.disabled=false;reviewToggle.disabled=false;glossary.disabled=false;segmentationSelect.disabled=false;recordingEngine=null;stream=null;for(const s of streams)s.cancel();streams.clear();for(const job of jobs){job.controller.abort();if(job.runId)void api('/api/cancel',{id:job.runId}).catch(()=>{});}jobs.clear();for(const card of panel.querySelectorAll('article'))card.remove();});
window.addEventListener('pagehide',()=>{for(const s of streams)s.cancel();});
window.addEventListener('dicta-take',async event=>{
 const take=event.detail,epoch=generation,controller=new AbortController(),reportAnchor=recordingAnchor,job={controller,runId:null,anchor:reportAnchor};jobs.add(job);recordingAnchor=null;
 const reviewContext=recordingContext;const reviewEnabled=recordingReview;const engine=recordingEngine??engineSelect.value;recordingEngine=null;engineSelect.disabled=false;reviewToggle.disabled=false;commandsToggle.disabled=false;const commandsEnabled=commandsToggle.checked;
 const streamTake=engine==='muse-stream'?stream:null;stream=null;const configId=recordingConfig;glossary.disabled=false;segmentationSelect.disabled=false;
 if(streamTake){streamTake.end(take.pcmHash);streamTake.card.remove();}
 const card=document.createElement('article');card.className='clip';card.dataset.pending='true';const title=document.createElement('strong');title.textContent=`Toma ${take.recordingId} · ${engine==='muse-stream'?'Muse-streaming':engine==='muse'?'Muse-Normal':'Whisper local'}`;
 const text=document.createElement('p');text.className='live-transcript';text.textContent='Preparando transcripción…';text.setAttribute('role','status');
 const timing=document.createElement('p');timing.className='tiny';const cancel=document.createElement('button');cancel.textContent='Cancelar transcripción';cancel.className='quiet';cancel.onclick=()=>{controller.abort();streamTake?.cancel();if(job.runId)void api('/api/cancel',{id:job.runId}).catch(()=>{});};
 card.append(title,text,timing,cancel);panel.append(card);take.trace.asr={status:'queued',runId:null};
 try{
  let audio=null;
  if(!isDemo){
   const response=await fetch('/api/audio',{method:'POST',signal:controller.signal,headers:{'Content-Type':'audio/wav','X-File-Name':encodeURIComponent(`dictado-${Date.now()}-${take.recordingId}.wav`)},body:take.blob});
   audio=await response.json();if(!response.ok)throw Error(audio.error);
   const compare=document.createElement('a');compare.href=`/?audio=${encodeURIComponent(audio.id)}&compare=both`;compare.target='_blank';compare.rel='noopener';compare.textContent='Toma guardada · comparar después con ambos motores';card.append(compare);
  }
  if(streamTake?.error)throw Error(streamTake.error);
  const state=await api('/api/state',undefined,controller.signal),config=state.configs.find(c=>engine==='whisper'?c.engine==='whisper'&&c.beams===1:c.id===configId);
  if(!config)throw Error('No hay configuración base para el motor elegido.');
  if(engine==='muse'&&!state.metaConfigured)throw Error('Falta la clave de Meta: configúrala en el laboratorio.');
  // Keep this response observable even if cancellation races with enqueue.
  if(streamTake){if(!streamTake.runId)throw Error('No se recibió identificación del streaming.');job.runId=streamTake.runId;}
  else{const queued=await api('/api/runs',{audioIds:[audio.id],configIds:[config.id],repeats:1,commandsEnabled,reviewEnabled,reviewContext});job.runId=queued.runIds[0];}
  take.trace.asr.runId=job.runId;
  if(controller.signal.aborted){await api('/api/cancel',{id:job.runId});throw Error('Cancelado.');}
  const deadline=performance.now()+360000;
  while(performance.now()<deadline){
   const state=await api('/api/state',undefined,controller.signal),run=state.runs.find(r=>r.id===job.runId);
   if(epoch!==generation)return;
   if(run?.status==='completed'){
    const finalText=run.formatting?.text??run.termFormatting?.text??run.numberFormatting?.text??run.text;
    text.textContent=finalText.trim()||(finalText.includes('\n')?'(Salto aplicado al informe.)':'(El motor devolvió texto vacío.)');
    await reportEditor.finish(reportAnchor,finalText,run.id);
    if(epoch!==generation)return;
    if(!isDemo)mountReview(card,run,{onChange:(old,next)=>epoch===generation&&reportEditor.review(reportAnchor,old,next)});
    showFigureDoubts(run.numberFormatting?.warnings??[]);
    const original=document.createElement('details'),summary=document.createElement('summary'),raw=document.createElement('pre');summary.textContent='Ver transcripción original y comandos';raw.textContent=run.text;original.append(summary,raw);
    const report=document.createElement('p');report.className='tiny';report.textContent=run.formatting?`${run.formatting.events.length} comandos aplicados · ${run.formatting.elapsedMs.toFixed(2)} ms · ${run.formatting.warnings.length} dudas conservadas sin convertir. ${run.formatting.warnings.map(w=>w.command+': posible uso literal o decimal').join('; ')}`:'Comandos desactivados para esta toma.';report.textContent+=run.numberFormatting?` Números: ${run.numberFormatting.events.length} conversiones · ${run.numberFormatting.elapsedMs.toFixed(2)} ms · ${run.numberFormatting.warnings.length} dudas.`:'';report.textContent+=run.termFormatting?.events.length?` Términos: ${run.termFormatting.events.map(e=>`${e.spoken} → ${e.replacement}`).join('; ')}.`:'';original.append(report);card.append(original);
    if(run.formatting?.warnings.length||run.numberFormatting?.warnings.length){const warning=document.createElement('p');warning.className='tiny';warning.textContent='Revisa las dudas de comandos: se conservaron palabras potencialmente literales o decimales.';card.append(warning);}
    // DOM update time, not a hardware measurement of screen presentation.
    const finalDomAt=performance.now();
    const {receiveEndToTextMs,receiveStartToFirstTextMs,receiveStartToFinalTextMs}=textIntervals({start:take.receivedStart,end:take.receivedEnd,final:finalDomAt,first:streamTake?.firstPartialMs==null?null:streamTake.started+streamTake.firstPartialMs,hasFinalText:!!finalText.trim()});
    const estimate=arrivalEstimate(take.stopStamp,take.stamp());
    const stopToTextEstimateMs=estimate?.usable?estimate.ms:null,clockUncertaintyMs=estimate?.uncertaintyMs??null;
    take.trace.asr={status:'completed',runId:run.id,engine,uiRevision:'numbers-live-v1',model:run.configuration.model,cold:run.result?.cold};
    for(const [key,value] of Object.entries({receiveStartToFinalTextMs,receiveStartToFirstTextMs,receiveEndToTextMs,stopToTextEstimateMs,clockUncertaintyMs,asrQueueMs:run.timings.queueMs,asrRunMs:run.timings.requestMs}))take.trace.stage(key,value);
    timing.textContent=`Detener → texto: ${stopToTextEstimateMs==null?'sin calibración':`≈ ${seconds(stopToTextEstimateMs)} (resolución orientativa ${seconds(clockUncertaintyMs)})`} · fin recibido en PC → texto: ${seconds(receiveEndToTextMs)} · cola: ${seconds(run.timings.queueMs)} · motor: ${seconds(run.timings.requestMs)}${run.result?.cold?' · primera carga del modelo':''}`;
    take.renderMetrics();
    if(run.stream){take.trace.asr.streaming={...run.stream,events:undefined};take.trace.stage('startToFirstPartialMs',streamTake?.firstPartialMs);timing.textContent+=` · inicio recibido → primer borrador: ${seconds(streamTake?.firstPartialMs)} · conexión Meta: ${seconds(run.stream.handshakeMs)} · fin recibido en servidor → final: ${seconds(run.stream.endToFinalMs)} · revisiones: ${run.stream.revisionCount} · cierre: ${run.stream.segmentation??'manual'} · segmentos: ${run.stream.segmentCount??0}`;take.renderMetrics();}
    try{await api('/api/live-measurements',{runId:run.id,recordingId:take.recordingId,source:take.trace.source,receiveStartToFinalTextMs,receiveStartToFirstTextMs,receiveEndToTextMs,stopToTextEstimateMs,clockUncertaintyMs,startToFirstPartialMs:streamTake?.firstPartialMs});}catch{timing.textContent+=' · No se pudo guardar esta medición; exporta las métricas de sesión.';}
    return;
   }
   if(run&&!['queued','running'].includes(run.status))throw Error(run.error?.includes('Muse HTTP 401')?'Meta rechazó la autenticación (401). Revisa que sea una clave activa de Meta Model API y vuelve a pegarla en Acceso a Meta del laboratorio; no hace falta reiniciar.':run.error||run.status);
   text.textContent=streamTake?'Esperando el resultado final de Muse-streaming…':run?.status==='running'?(engine==='muse'?'Transcribiendo con Muse en Meta…':'Transcribiendo en tu GPU… La primera toma puede tardar mientras carga el modelo.'):'Esperando turno de transcripción…';
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  await api('/api/cancel',{id:job.runId});throw Error('Tiempo de espera agotado.');
 }catch(error){if(epoch===generation){reportEditor.cancel(reportAnchor);text.textContent=controller.signal.aborted?'Transcripción cancelada.':`No se pudo transcribir: ${error.message}`;take.trace.asr={status:controller.signal.aborted?'cancelled':'error',runId:job.runId,engine,uiRevision:'commands-live-v1'};timing.textContent=`Fin recibido en PC → error/cancelación: ${seconds(performance.now()-take.receivedEnd)}`;take.renderMetrics();}}
 finally{if(streamTake){streams.delete(streamTake);if(!streamTake.done)streamTake.cancel();}jobs.delete(job);cancel.remove();delete card.dataset.pending;trimTakeCards(panel);}
});
