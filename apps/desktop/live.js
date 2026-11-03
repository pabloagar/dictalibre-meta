import {t as tr, language, mountLanguageSwitch} from '../shared/i18n.js';
import {textIntervals} from '/shared/lab-timing.js';
import {mountReport} from '/report-editor.js';
import {mountReview,sharedState,trimTakeCards} from '/review-ui.js';
import {arrivalEstimate} from '/shared/metrics.js';
import {startStream,createTakeQueue} from '/stream-client.js';
const panel=document.querySelector('.transcript-paper');
document.querySelector('header .tag').textContent=tr('DICTADO · MUSE / WHISPER');
document.querySelector('footer').textContent=tr('dicta · CAPTURA → MOTOR ELEGIDO → TEXTO');
for(const p of document.querySelectorAll('.diagnostics p'))if(p.textContent.startsWith(tr('Por integrar:')))p.textContent=tr('Por toma: cola y procesamiento. Streaming: conexión, primer borrador, revisiones y final. Revisor Meta opcional con aprobación humana.');
panel.replaceChildren();panel.setAttribute('aria-label',tr('Transcripciones por toma'));
const modelBadge=document.querySelector('.section-head .tag');
const engineLabel=document.createElement('div');engineLabel.textContent=tr('Motor para la próxima toma ');const engineSelect=document.createElement('select');engineSelect.setAttribute('aria-label',tr('Motor para dictar'));engineSelect.add(new Option('Muse-Normal','muse'));engineSelect.add(new Option(tr('Whisper local'),'whisper'));engineLabel.append(engineSelect);panel.before(engineLabel);
const engineHint=document.createElement('p');engineHint.className='tiny';engineLabel.after(engineHint);
const reviewLabel=document.createElement('label'),reviewToggle=document.createElement('input');reviewToggle.type='checkbox';reviewToggle.checked=true;reviewLabel.append(reviewToggle,tr(' Revisor Meta al terminar cada toma (envía toma, contexto del informe y plantilla a Meta)'));engineLabel.after(reviewLabel);
const initialState=await api('/api/state');
const isDemo=initialState.demo===true;
engineSelect.add(new Option('Muse-streaming','muse-stream'));
const glossaryLabel=document.createElement('div'),glossary=document.createElement('select');glossary.setAttribute('aria-label',tr('Glosario de Muse'));
for(const c of initialState.configs.filter(c=>c.engine==='muse'&&(c.language??'es')===language()))glossary.add(new Option(c.keywords.length?tr`${c.name} · ${c.keywords.length} términos`:tr('Sin glosario'),c.id));
glossaryLabel.append(tr('Glosario de Muse '),glossary);engineLabel.after(glossaryLabel);
const segmentationLabel=document.createElement('div'),segmentationSelect=document.createElement('select');segmentationSelect.setAttribute('aria-label',tr('Segmentación de Muse-streaming'));segmentationSelect.add(new Option(tr('Cierre manual'),'manual'));segmentationSelect.add(new Option(tr('Automática · prueba'),'automatic'));segmentationLabel.append(tr('Segmentación '),segmentationSelect);glossaryLabel.after(segmentationLabel);
const commandsLabel=document.createElement('label'),commandsToggle=document.createElement('input');commandsToggle.type='checkbox';commandsToggle.checked=true;commandsLabel.append(commandsToggle,tr(' Aplicar comandos de dictado'));engineHint.after(commandsLabel);
const segmentHelp=document.createElement('p');segmentHelp.className='tiny';segmentHelp.textContent=tr('Automática: las pausas pueden consolidar segmentos; el micrófono sigue activo hasta detener. No crean párrafos. Números/comandos se aplican al final de la toma. Máximo 3 minutos.');segmentationLabel.append(segmentHelp);
const commandHelp=document.createElement('p');commandHelp.className='tiny';commandHelp.textContent=tr('Punto · coma · dos puntos · punto y coma · nueva línea · nuevo párrafo. Se aplican al terminar la toma; original conservado. Desactiva para dictar comandos literalmente. Las cantidades se muestran en cifras, conservando el original.');commandsLabel.after(commandHelp);
engineSelect.value=initialState.metaConfigured?'muse-stream':'whisper';
if(isDemo){engineSelect.replaceChildren(new Option('Muse-streaming','muse-stream'));engineSelect.value='muse-stream';reviewToggle.checked=false;reviewLabel.hidden=true;segmentationSelect.replaceChildren(new Option(tr('Cierre manual'),'manual'));segmentHelp.textContent=tr('Detén la grabación para cerrar la toma. Máximo 3 minutos por toma.');}
const updateEngine=()=>{segmentationLabel.hidden=engineSelect.value!=='muse-stream';glossaryLabel.hidden=engineSelect.value==='whisper';modelBadge.textContent=engineSelect.value==='muse-stream'?'MUSE · STREAMING':engineSelect.value==='muse'?tr('MUSE · POR TOMA'):'WHISPER LOCAL · GPU';engineHint.textContent=engineSelect.value==='muse-stream'?tr('El audio se envía a Meta mientras hablas. El borrador puede cambiar; números y comandos se aplican al final. Las tomas siguientes se procesan en orden; espera «Grabando» antes de hablar.'):engineSelect.value==='muse'?tr('Cada toma completa se envía a Meta para transcribir. Usa la clave configurada en el laboratorio.'):tr('El audio se transcribe en la GPU de este PC. La primera toma puede tardar mientras carga el modelo.');};
engineSelect.onchange=updateEngine;updateEngine();let recordingEngine=null;
const reserveTake=createTakeQueue(),takeSlots=new Map();
let stream=null,recordingConfig=null,recordingReview=true,recordingAnchor=null,recordingContext=null;const streams=new Set();
window.addEventListener('dicta-recording-start',e=>{
 recordingContext=reportEditor.context();recordingAnchor=crypto.randomUUID();const queuedAnchor=recordingAnchor,previousAnchor=[...takeSlots.keys()].at(-1),slot=reserveTake();takeSlots.set(queuedAnchor,slot);slot.ready.then(()=>{if(takeSlots.has(queuedAnchor))reportEditor.begin(queuedAnchor,previousAnchor);});
 recordingReview=reviewToggle.checked;reviewToggle.disabled=true;recordingEngine=engineSelect.value;recordingConfig=glossary.value;engineSelect.disabled=true;commandsToggle.disabled=true;glossary.disabled=true;segmentationSelect.disabled=true;
 if(recordingEngine==='muse-stream'){
  const anchor=recordingAnchor,streamConfig=recordingConfig,streamReview=recordingReview,streamContext=recordingContext,streamCommands=commandsToggle.checked,streamSegmentation=segmentationSelect.value;
  const card=document.createElement('article');card.className='clip';card.dataset.pending='true';const title=document.createElement('strong');title.textContent=tr`Toma ${e.detail.id} · Muse-streaming · BORRADOR`;
  const partial=document.createElement('p');partial.className='live-transcript';partial.setAttribute('role','status');partial.textContent=tr('Conectando con Muse…');card.append(title,partial);panel.append(card);
  stream=slot.open(()=>startStream({rate:e.detail.rate,configId:streamConfig,commandsEnabled:streamCommands,reviewEnabled:streamReview,reviewContext:streamContext,segmentation:streamSegmentation,onPartial:t=>{partial.textContent=t;},onDraft:t=>reportEditor.preview(anchor,t),onSegments:segments=>{reportEditor.preview(anchor,segments.map(s=>s.text??s.partial??'').filter(Boolean).join(' '));partial.replaceChildren();for(const segment of segments){const row=document.createElement('div');const label=document.createElement('small');label.textContent=segment.text===null?tr('Borrador · '):tr('Consolidado por Muse · ');row.append(label,document.createTextNode(segment.text??segment.partial??''));partial.append(row);}title.textContent=tr`Toma ${e.detail.id} · Muse-streaming · ${segments.filter(t=>t.text!==null).length} segmentos consolidados · micrófono activo`;}}));stream.card=card;streams.add(stream);
 }
});
window.addEventListener('dicta-pcm',e=>stream?.send(e.detail.bytes));
window.addEventListener('dicta-recording-abort',()=>{stream?.cancel();stream=null;reportEditor.cancel(recordingAnchor);takeSlots.get(recordingAnchor)?.release();takeSlots.delete(recordingAnchor);recordingAnchor=null;});
window.addEventListener('dicta-recording-stop',()=>{engineSelect.disabled=false;reviewToggle.disabled=false;recordingEngine=null;commandsToggle.disabled=false;glossary.disabled=false;segmentationSelect.disabled=false;});
const notice=document.createElement('p');notice.className='live-notice';notice.textContent=tr('Por toma: texto al terminar. Streaming: borrador mientras hablas y texto final al detener. Audio y resultados se guardan en el laboratorio local.');panel.append(notice);
if(isDemo)notice.textContent=tr('Demostración: el audio se envía a Meta y este servidor no lo guarda. Al confirmar Revisar con IA, también envías el informe y su contexto a Meta. Las revisiones permanecen temporalmente en la sesión del servidor; el borrador se guarda en este navegador. Solo material sintético.');
else{const link=document.createElement('a');link.href='/';link.target='_blank';link.rel='noopener';link.textContent=tr('Abrir laboratorio y comparar tomas');notice.append(document.createElement('br'),link);}
const jobs=new Set();let generation=0;
const reportEditor=mountReport(panel,{build:initialState.build,sourceHash:initialState.sourceHash,globalReview:!isDemo||initialState.reportReviewAvailable===true});
const figureAlert=document.createElement('div');figureAlert.className='figure-alert';figureAlert.setAttribute('role','alert');figureAlert.hidden=true;reportEditor.element.before(figureAlert);
function showFigureDoubts(warnings){
 const doubts=warnings.filter(w=>w.reason==='possible_sentence_boundary');
 figureAlert.replaceChildren();figureAlert.hidden=!doubts.length;if(!doubts.length)return;
 const message=document.createElement('span');message.textContent=tr`Confirma ${doubts.length===1?tr('la cifra'):tr('las cifras')}: ${doubts.map(w=>tr`«${w.spoken}» se escribió «${w.replacement}»`).join('; ')}. Si eran dos frases, corrígelo en el informe.`;
 const ok=document.createElement('button');ok.type='button';ok.textContent=tr('Entendido');ok.onclick=()=>{figureAlert.hidden=true;};figureAlert.append(message,ok);
}
// Hoja clínica: preserve the mounted editor, transport controls and listeners.
document.body.classList.add('live-workspace','clinical-workspace');
const layoutMetrics={language:language(),version:'stitch-direct-dictation-v2',settingsVersion:'dictado-agrupado-v1',serverBuild:initialState.build??null,serverSourceHash:initialState.sourceHash??null,createdAt:new Date().toISOString(),browser:navigator.userAgent,device:null,network:null,audioSource:null,clockResolutionMs:null,instrumentationOverheadMs:null,audioMeter:{updates:0,totalPaintMs:0,maxPaintMs:0,source:'received-pcm-rms'},events:[]};
const track=(type,data={})=>{layoutMetrics.events.push({type,atMs:performance.now(),...data});if(layoutMetrics.events.length>500)layoutMetrics.events.shift();};
const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
const makeDetails=(label,cls)=>{const d=make('details',cls);d.append(make('summary','',label));return d;};
const report=reportEditor.element.closest('.report-workspace'),controls=report.querySelector('.report-controls');
const header=document.querySelector('header'),brandArtwork=header.querySelector('.dicta-wordmark');header.replaceChildren();
const brand=make('div','clinical-brand');brand.append(brandArtwork??make('span','','dicta.'));brand.append(make('small','',tr('prototipo · solo material sintético')));header.append(brand,controls);
const templatePanel=report.querySelector('.template-library-panel')??controls.querySelector('.template-library-panel');
const sex=make('div','sex-control');sex.setAttribute('role','group');sex.setAttribute('aria-label',tr('Sexo del estudio'));sex.append(make('span','',tr('Sexo')));
for(const value of ['F','M','—']){const button=make('button','',value);button.setAttribute('aria-pressed',String(value===reportEditor.getSex()));button.onclick=()=>reportEditor.setSex(value);sex.append(button);}
reportEditor.element.addEventListener('editor-study-state',e=>{for(const b of sex.querySelectorAll('button')){b.setAttribute('aria-pressed',String(b.textContent===e.detail.sex));b.disabled=reportEditor.model.pending;}});
reportEditor.element.addEventListener('report-new',()=>{figureAlert.hidden=true;});
const connection=makeDetails(tr('Conecta tu teléfono para empezar'),'connection-panel'),pairing=document.querySelector('.pairing');connection.append(pairing);
const closeConnection=make('button','connection-close',tr('Cerrar'));closeConnection.setAttribute('aria-label',tr('Cerrar conexión'));pairing.prepend(closeConnection);closeConnection.onclick=()=>{connection.open=false;connection.querySelector('summary').focus();};
const connectButton=pairing.querySelector('#create');connectButton.textContent=tr('Mostrar QR');pairing.querySelector('#phone-link').textContent=tr('Abrir vista del teléfono ↗').replace('↗','').trim();
const strip=document.querySelector('.record-strip');strip.classList.add('clinical-record');
controls.prepend(connection,strip);connection.addEventListener('toggle',()=>{if(connection.open&&document.querySelector('#paired').hidden&&document.querySelector('#pairing').hidden&&document.querySelector('#confirm-panel').hidden&&!connectButton.disabled)connectButton.click();});
const syncConnection=()=>{const connected=!document.querySelector('#paired').hidden;connection.classList.toggle('is-connected',connected);connection.querySelector('summary').textContent=connected?(document.querySelector('#paired').dataset.paused==='true'?tr('Teléfono en pausa'):tr('Teléfono conectado')):tr('Conecta tu teléfono para empezar');if(connected)connection.open=false;};
new MutationObserver(syncConnection).observe(document.querySelector('#paired'),{attributes:true,attributeFilter:['hidden','data-paused']});syncConnection();
const settings=makeDetails(tr('Ajustes'),'clinical-settings');const editbar=make('div','clinical-editbar');editbar.setAttribute('role','toolbar');editbar.setAttribute('aria-label',tr('Edición del informe'));report.prepend(editbar);editbar.append(controls.querySelector('.report-undo'),controls.querySelector('.report-redo'));
const settingsBody=make('div','settings-body');settings.append(settingsBody);settingsBody.append(engineLabel,glossaryLabel,segmentationLabel,reviewLabel,commandsLabel,engineHint,commandHelp);
const sizeControls=make('div','size-controls',tr('Texto '));sizeControls.append(controls.querySelector(tr('[aria-label="Reducir tamaño del informe"]')),controls.querySelector('.report-font-value'),controls.querySelector(tr('[aria-label="Aumentar tamaño del informe"]')));editbar.append(sizeControls,controls.querySelector('.report-new'),templatePanel,settings);
function resolveTheme(saved){return saved==='sala'?'ambar':['dia','penumbra','ambar'].includes(saved)?saved:'penumbra';}
const primaryActions=make('div','primary-actions');primaryActions.append(controls.querySelector('.report-review-button'),controls.querySelector('.report-copy'));
const startControls=make('div','clinical-start');startControls.append(brand,connection);controls.classList.add('clinical-topbar');controls.replaceChildren(startControls,strip,primaryActions);
let theme='penumbra';try{const saved=localStorage.getItem('dicta-theme-v1');theme=resolveTheme(saved);if(saved==='sala')localStorage.setItem('dicta-theme-v1',theme);}catch{}
const appearance=make('section','appearance-panel');appearance.append(make('h3','',tr('Apariencia')));
const themeCards=make('div','theme-cards');themeCards.setAttribute('role','radiogroup');themeCards.setAttribute('aria-label',tr('Tema'));appearance.append(themeCards);
const themeDescriptions={dia:tr('Hueso atenuado para una sala con luz.'),penumbra:tr('Grafito neutro y acento azul apagado.'),ambar:tr('Sepia profundo y acento ámbar.')};
const applyTheme=()=>{document.body.dataset.theme=theme;for(const card of themeCards.children)card.setAttribute('aria-checked',String(card.dataset.value===theme));};
for(const [value,label] of [['dia',tr('Día')],['penumbra',tr('Penumbra')],['ambar',tr('Ámbar')]]){
 const card=make('button','theme-card');card.type='button';card.dataset.value=value;card.setAttribute('role','radio');card.setAttribute('aria-label',label);card.append(make('strong','',label));
 const sample=make('span','theme-sample');sample.dataset.theme=value;sample.setAttribute('aria-hidden','true');const paper=make('span','sample-sheet',tr('Texto del informe '));paper.append(make('span','sample-mark',tr('revisable')),make('span','sample-muted',tr('Texto secundario')));const actions=make('span','sample-actions');actions.append(make('span','',tr('Copiar al portapapeles')),make('span','',tr('Revisar con IA')));sample.append(paper,actions);card.append(sample,make('span','',themeDescriptions[value]));themeCards.append(card);
 card.onclick=()=>{theme=value;applyTheme();try{localStorage.setItem('dicta-theme-v1',theme);}catch{}track('theme',{theme});};
 card.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const cards=[...themeCards.children],direction=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1,next=cards[(cards.indexOf(card)+direction+cards.length)%cards.length];next.click();next.focus();}};
}
applyTheme();settingsBody.append(appearance);
const labLink=isDemo?null:make('a','lab-link',tr('Abrir laboratorio'));if(labLink){labLink.href='/';labLink.target='_blank';labLink.rel='noopener';settingsBody.append(labLink);}
const takes=makeDetails(tr('Tomas y Revisor Meta · últimas 5'),'takes-panel');takes.append(panel);
const diagnostics=document.querySelector('.diagnostics');diagnostics.prepend(document.querySelector('.live-metrics'));diagnostics.append(report.querySelector('.editor-export'));
const recordings=document.querySelector('#recordings').closest('details');settingsBody.append(takes,recordings,diagnostics);
const transcript=document.querySelector('.transcript');document.querySelector('.section-head').remove();
const desk=make('div','clinical-desk'),sheet=make('div','clinical-sheet'),sheetHead=make('div','sheet-head');
sheetHead.append(make('span','',tr('Informe radiológico · documento en curso')));
sizeControls.after(sex);
reportEditor.element.before(desk);const canvas=make('div','dictation-canvas');desk.append(canvas);canvas.append(editbar,sheet);sheet.append(sheetHead,reportEditor.element);
const margin=make('aside','clinical-notes');margin.setAttribute('aria-label',tr('Notas del estudio'));desk.append(margin);
const connectionNote=make('section','clinical-note neutral');connectionNote.append(make('h2','',tr('Estado del teléfono')),document.querySelector('#record-help'));settingsBody.append(connectionNote);
const glossaryText=make('p','tiny');
const syncGlossary=()=>{const c=initialState.configs.find(c=>c.id===glossary.value);glossaryText.hidden=!c?.keywords?.length;glossaryText.textContent=c?.keywords?.length?tr`${c.keywords.length} términos para orientar el reconocimiento. ${initialState.demo&&c.id==='demo-muse'?tr('Evaluación preliminar; revisa el resultado.'):tr('Mejora sin medir.')}`:'';};syncGlossary();glossary.addEventListener('change',syncGlossary);
margin.append(figureAlert);
const help=report.querySelector('.report-help');const editorHelp=makeDetails(tr('Ayuda del editor'),'editor-help');editorHelp.append(help);settingsBody.append(editorHelp);
// Settings is a single modal surface; controls retain their original handlers.
const dictationSettings=make('section','dictation-settings-page');dictationSettings.setAttribute('aria-label',tr('Dictado'));
dictationSettings.append(make('h3','',tr('Dictado')),make('p','settings-intro',tr('Elige cómo transcribir y qué aplicar al terminar cada toma.')));
const transcriptionSettings=make('section','dictation-section transcription-settings');transcriptionSettings.setAttribute('aria-label',tr('Transcripción'));
for(const field of [engineLabel,glossaryLabel,segmentationLabel]){field.className='setting-field';field.replaceChild(make('span','setting-label',field.firstChild.textContent.trim()),field.firstChild);}
engineLabel.classList.add('engine-setting');engineLabel.append(engineHint);glossaryLabel.append(glossaryText);engineHint.id='dictation-engine-help';engineSelect.setAttribute('aria-describedby',engineHint.id);
segmentHelp.id='dictation-segment-help';segmentationSelect.setAttribute('aria-describedby',segmentHelp.id);
transcriptionSettings.append(engineLabel,glossaryLabel,segmentationLabel);
const textSettings=make('section','dictation-section text-settings');textSettings.append(make('h4','',tr('Al terminar la toma')));
const setSwitchRow=(label,input,title,description,id)=>{label.className='setting-switch';const copy=make('span','setting-switch-copy'),name=make('strong','',title),hint=make('span','setting-description',description);hint.id=id;copy.append(name,hint);input.setAttribute('role','switch');input.setAttribute('aria-label',title);input.setAttribute('aria-describedby',id);label.replaceChildren(copy,input);};
setSwitchRow(commandsLabel,commandsToggle,tr('Aplicar comandos de dictado'),tr('«Punto», «coma» o «nueva línea» se convierten en formato. Desactiva para escribirlos literalmente.'),'dictation-commands-help');
setSwitchRow(reviewLabel,reviewToggle,tr('Revisar cada toma con IA'),tr('Envía la toma, el contexto del informe y la plantilla a Meta para su revisión.'),'dictation-review-help');
const commandDetails=makeDetails(tr('Ver comandos y formato de números'),'command-reference');commandDetails.append(commandHelp);
textSettings.append(commandsLabel,commandDetails,reviewLabel);
const advanced=makeDetails(isDemo?tr('Detalles de la sesión'):tr('Herramientas del laboratorio'),'advanced-settings');advanced.querySelector('summary').append(make('span','advanced-description',tr('Tomas, audio recibido y diagnóstico')));
for(const child of [labLink,recordings,takes,diagnostics,connectionNote])if(child)advanced.append(child);
advanced.hidden=isDemo;
dictationSettings.append(transcriptionSettings,textSettings,advanced);
const howTo=make('section','howto-panel');howTo.append(make('h3','',tr('Cómo usar')));const steps=make('div','help-steps');
for(const [title,description] of [[(language()==='en'?'1 · Connect':'1 · Conectar'),tr('Conecta tu teléfono con el QR o código. También puedes escribir directamente sin teléfono.')],[(language()==='en'?'2 · Dictate':'2 · Dictar'),tr('Inicia y detén la grabación desde el teléfono. Espera a que termine el texto provisional.')],[(language()==='en'?'3 · Review':'3 · Revisar'),tr('Lee el informe y sus medidas. Si está disponible, usa Revisar con IA y comprueba cada aviso.')],[(language()==='en'?'4 · Copy':'4 · Copiar'),tr('Copia el texto para pegarlo en el RIS. Usa Nuevo informe para empezar el siguiente estudio.')]]){const step=make('article','help-step');step.append(make('h4','',title),make('p','',description));steps.append(step);}howTo.append(steps,editorHelp);
const helpConnect=make('button','',tr('Empezar: conectar mi teléfono')),helpWrite=make('button','',tr('Escribir sin teléfono'));howTo.append(helpConnect,helpWrite);
helpConnect.onclick=()=>{settings.open=false;connection.open=true;connection.querySelector('summary').focus();};helpWrite.onclick=()=>{settings.open=false;reportEditor.element.focus();};
const settingsNav=make('nav','settings-nav');settingsNav.setAttribute('aria-label',tr('Secciones de ajustes'));settingsNav.append(make('h2','',tr('Ajustes')));
const settingsMain=make('div','settings-main'),settingsClose=make('button','settings-close',tr('Cerrar'));settingsClose.onclick=()=>{settings.open=false;settings.querySelector('summary').focus();};settingsMain.append(settingsClose,dictationSettings,appearance,howTo);
const pages={dictado:dictationSettings,apariencia:appearance,ayuda:howTo};
const showSettingsPage=name=>{for(const [key,page] of Object.entries(pages))page.hidden=key!==name;for(const button of settingsNav.querySelectorAll('button'))button.setAttribute('aria-current',button.dataset.page===name?'page':'false');track('settings-page',{page:name});};
for(const [name,title] of [['dictado',tr('Dictado')],['apariencia',tr('Apariencia')],['ayuda',tr('Cómo usar')]]){const button=make('button','settings-tab',title);button.dataset.page=name;button.onclick=()=>showSettingsPage(name);settingsNav.append(button);}showSettingsPage('dictado');
const brandStack=make('div','brand-stack');brand.before(brandStack);brandStack.append(brand);
const brandLanguages=make('div','brand-languages');brandStack.append(brandLanguages);
const languageSelect=mountLanguageSwitch(brandLanguages,()=>!reportEditor.model.pending&&!recordingEngine);
languageSelect.parentElement.hidden=true;
const languageButtons=make('div','language-buttons');languageButtons.setAttribute('role','group');languageButtons.setAttribute('aria-label','Language / Idioma');brandLanguages.append(languageButtons);
for(const [value,label,name] of [['en','ENG','English'],['es','ES','Español']]){const button=make('button','',label);button.type='button';button.lang=value;button.setAttribute('aria-label',name);button.setAttribute('aria-pressed',String(language()===value));button.onclick=()=>{if(languageSelect.disabled||language()===value)return;languageSelect.value=value;languageSelect.dispatchEvent(new window.Event('change'));};languageButtons.append(button);}
new MutationObserver(()=>{for(const button of languageButtons.children)button.disabled=languageSelect.disabled;}).observe(languageSelect,{attributes:true,attributeFilter:['disabled']});
window.addEventListener('dicta-language-change',e=>{if(reportEditor.model.pending||recordingEngine)e.preventDefault();});
window.addEventListener('dicta-recording-start',()=>{languageSelect.disabled=true;});
window.addEventListener('dicta-recording-stop',()=>{languageSelect.disabled=reportEditor.model.pending;});
new MutationObserver(()=>{languageSelect.disabled=reportEditor.model.pending||!!recordingEngine;}).observe(reportEditor.element,{childList:true,subtree:true});
settingsBody.replaceChildren(settingsNav,settingsMain);settingsBody.setAttribute('role','dialog');settingsBody.setAttribute('aria-modal','true');settingsBody.setAttribute('aria-label',tr('Ajustes'));settingsBody.tabIndex=-1;
const settingsBackdrop=make('div','settings-backdrop');settingsBackdrop.setAttribute('aria-hidden','true');settingsBody.before(settingsBackdrop);settingsBackdrop.onclick=()=>{settings.open=false;settings.querySelector('summary').focus();};
settings.addEventListener('toggle',()=>{if(settings.open)settingsClose.focus();});
settingsBody.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...settingsBody.querySelectorAll('button,input,select,a[href],summary')].filter(n=>!n.disabled&&!n.closest('[hidden]')&&!n.hidden&&n.tabIndex!==-1&&!(n.matches('summary')?n.parentElement.parentElement:n.parentElement)?.closest('details:not([open])'));const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
const emptyGuide=make('div','empty-guide');
const guideText=make('p','',tr('Conecta tu teléfono para dictar, o escribe aquí directamente. Usa ')),templateShortcut=make('button','inline-template-link',tr('Plantilla'));templateShortcut.type='button';
const templatePicker=templatePanel.querySelector('.template-picker');templatePicker.id='report-template-picker';templateShortcut.setAttribute('aria-controls',templatePicker.id);templateShortcut.setAttribute('aria-expanded','false');
templateShortcut.onclick=()=>{templatePanel.open=true;track('template-entry',{source:'empty-guide'});};templatePanel.addEventListener('toggle',()=>templateShortcut.setAttribute('aria-expanded',String(templatePanel.open)));
guideText.append(templateShortcut,tr(' si quieres partir de una estructura.'));emptyGuide.append(guideText,reportEditor.quickTemplates);reportEditor.element.after(emptyGuide);
const emptySteps=make('div','empty-steps');emptySteps.append(make('strong','',tr('CÓMO USAR')),steps.cloneNode(true));emptyGuide.append(emptySteps);
const syncFirstHelp=()=>{emptyGuide.hidden=reportEditor.element.dataset.empty!=='true';};new MutationObserver(syncFirstHelp).observe(reportEditor.element,{attributes:true,attributeFilter:['data-empty']});syncFirstHelp();
// Segmented buttons drive the same selects; no changes to engine or transport logic.
for(const select of [engineSelect,segmentationSelect,glossary]){const group=make('div','settings-segments');group.setAttribute('role','group');group.setAttribute('aria-label',select.getAttribute('aria-label'));if(select.hasAttribute('aria-describedby'))group.setAttribute('aria-describedby',select.getAttribute('aria-describedby'));select.hidden=true;select.after(group);const sync=()=>{group.replaceChildren();for(const option of select.options){const b=make('button','',option.textContent);b.type='button';b.disabled=select.disabled;b.setAttribute('aria-pressed',String(select.value===option.value));b.onclick=()=>{select.value=option.value;select.dispatchEvent(new window.Event('change'));sync();};group.append(b);}};sync();select.addEventListener('change',sync);new MutationObserver(sync).observe(select,{attributes:true,attributeFilter:['disabled']});}
commandsToggle.setAttribute('role','switch');
const status=document.querySelector('#status');status.classList.add('clinical-status');sheetHead.before(status);
margin.append(reportEditor.reviewPanel);
const level=document.querySelector('#level'),bars=make('span','audio-bars');bars.setAttribute('aria-hidden','true');for(let i=0;i<9;i++)bars.append(make('i',''));level.after(bars);
const paintLevel=()=>{const paintStart=performance.now();const value=Math.max(0,Math.min(1,Number(level.value)||0));for(const [i,bar] of [...bars.children].entries()){const lit=value>(i+1)/12;bar.style.height=(3+(lit?value*(13-Math.abs(i-4)):0))+'px';bar.classList.toggle('lit',lit);}const elapsed=performance.now()-paintStart;layoutMetrics.audioMeter.updates++;layoutMetrics.audioMeter.totalPaintMs+=elapsed;layoutMetrics.audioMeter.maxPaintMs=Math.max(layoutMetrics.audioMeter.maxPaintMs,elapsed);};new MutationObserver(paintLevel).observe(level,{attributes:true,attributeFilter:['value']});paintLevel();
const layoutExport=make('button','',tr('Exportar mediciones de disposición'));diagnostics.append(layoutExport);layoutExport.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(layoutMetrics,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='dicta-disposicion-metricas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
for(const [name,element] of [['connection',connection],['settings',settings],['templates',templatePanel],['takes-review',takes],['diagnostics',diagnostics],['advanced-settings',advanced]])element.addEventListener('toggle',()=>track('panel-toggle',{panel:name,open:element.open}));
document.addEventListener('report-layer-open',()=>{for(const p of [connection,settings,templatePanel])p.open=false;});
for(const popup of [connection,settings,templatePanel])popup.addEventListener('toggle',()=>{if(popup.open)document.dispatchEvent(new CustomEvent('report-close-confirm'));if(popup.open)for(const other of [connection,settings,templatePanel])if(other!==popup)other.open=false;});
const positionPopup=(popup,body,right=false)=>{if(!popup.open||body.parentElement?.classList.contains('scan-home'))return;const anchor=popup.querySelector('summary').getBoundingClientRect(),top=Math.max(8,Math.min(anchor.bottom+8,window.innerHeight-100)),width=Math.min(right?780:420,window.innerWidth-32);body.style.width=width+'px';body.style.left=(right?Math.max(8,window.innerWidth-width-16):Math.max(8,Math.min(anchor.left,window.innerWidth-width-8)))+'px';body.style.top=top+'px';body.style.maxHeight=Math.max(80,window.innerHeight-top-12)+'px';};
const positionPopups=()=>{positionPopup(connection,pairing);positionPopup(templatePanel,templatePanel.querySelector('.template-picker'),true);};
for(const popup of [connection,templatePanel])popup.addEventListener('toggle',positionPopups);
window.addEventListener('resize',positionPopups);window.addEventListener('scroll',positionPopups,{capture:true,passive:true});
document.addEventListener('click',e=>{for(const popup of [connection,settings])if(popup.open&&!e.composedPath().includes(popup)){popup.open=false;track('panel-dismiss',{panel:popup===connection?'connection':'settings',reason:'outside'});}},{capture:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const popup of [connection,settings,templatePanel])if(popup.open){popup.open=false;popup.querySelector('summary').focus();}});
let lastScroll=0;reportEditor.element.addEventListener('scroll',()=>{const now=performance.now();if(now-lastScroll>200){track('editor-scroll');lastScroll=now;}},{passive:true});
requestAnimationFrame(()=>{const r=reportEditor.element.getBoundingClientRect();track('editor-visible',{viewportWidth:innerWidth,viewportHeight:innerHeight,top:r.top,width:r.width,height:r.height,visibleHeight:Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(0,r.top)),initialCharacters:reportEditor.model.text.length});});
requestAnimationFrame(()=>{const h=header.getBoundingClientRect(),s=strip.getBoundingClientRect();track('header-layout',{viewportWidth:innerWidth,headerCenterPx:(h.left+h.right)/2,statusCenterPx:(s.left+s.right)/2,centerOffsetPx:(s.left+s.right-h.left-h.right)/2});});
 const seconds=v=>v==null?tr('sin medición'):`${(v/1000).toFixed(2)} s`;
async function api(path,data,signal){if(path==='/api/state'&&data===undefined)return sharedState();const response=await fetch(path,{signal,...(data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})});const value=await response.json();if(!response.ok)throw Error(tr(value.error));return value;}
window.addEventListener('dicta-new-session',()=>{generation++;for(const slot of takeSlots.values())slot.cancel();takeSlots.clear();if(recordingAnchor)reportEditor.cancel(recordingAnchor);for(const job of jobs)if(job.anchor)reportEditor.cancel(job.anchor);recordingAnchor=null;commandsToggle.disabled=false;engineSelect.disabled=false;reviewToggle.disabled=false;glossary.disabled=false;segmentationSelect.disabled=false;recordingEngine=null;stream=null;for(const s of streams)s.cancel();streams.clear();for(const job of jobs){job.controller.abort();if(job.runId)void api('/api/cancel',{id:job.runId}).catch(()=>{});}jobs.clear();for(const card of panel.querySelectorAll('article'))card.remove();});
window.addEventListener('pagehide',()=>{for(const s of streams)s.cancel();});
window.addEventListener('dicta-take',async event=>{
 const take=event.detail,epoch=generation,controller=new AbortController(),reportAnchor=recordingAnchor,takeSlot=takeSlots.get(reportAnchor),job={controller,runId:null,anchor:reportAnchor};jobs.add(job);recordingAnchor=null;
 const reviewContext=recordingContext;const reviewEnabled=recordingReview;const engine=recordingEngine??engineSelect.value;recordingEngine=null;engineSelect.disabled=false;reviewToggle.disabled=false;commandsToggle.disabled=false;const commandsEnabled=commandsToggle.checked;
 const streamTake=engine==='muse-stream'?stream:null;stream=null;const configId=recordingConfig;glossary.disabled=false;segmentationSelect.disabled=false;
 if(streamTake){streamTake.end(take.pcmHash);streamTake.card.remove();}
 const card=document.createElement('article');card.className='clip';card.dataset.pending='true';const title=document.createElement('strong');title.textContent=tr`Toma ${take.recordingId} · ${engine==='muse-stream'?'Muse-streaming':engine==='muse'?'Muse-Normal':tr('Whisper local')}`;
 const text=document.createElement('p');text.className='live-transcript';text.textContent=takeSlots.size>1?tr('Toma recibida · en cola de transcripción…'):tr('Preparando transcripción…');text.setAttribute('role','status');
 const timing=document.createElement('p');timing.className='tiny';const cancel=document.createElement('button');cancel.textContent=tr('Cancelar transcripción');cancel.className='quiet';cancel.onclick=()=>{controller.abort();streamTake?.cancel();if(job.runId)void api('/api/cancel',{id:job.runId}).catch(()=>{});};
 card.append(title,text,timing,cancel);panel.append(card);take.trace.asr={status:'queued',runId:null};
 try{
  await takeSlot?.ready;track('take-queue-ready',{recordingId:take.recordingId,waitMs:performance.now()-take.receivedEnd});await streamTake?.opened;
  if(streamTake){const handshakeDeadline=performance.now()+15000;while(!streamTake.runId&&!streamTake.error&&performance.now()<handshakeDeadline&&!controller.signal.aborted)await new Promise(r=>setTimeout(r,25));}
  if(controller.signal.aborted||epoch!==generation)throw Error(tr('Cancelado.'));
  let audio=null;
  if(!isDemo){
   const response=await fetch('/api/audio',{method:'POST',signal:controller.signal,headers:{'Content-Type':'audio/wav','X-File-Name':encodeURIComponent(`dictado-${Date.now()}-${take.recordingId}.wav`)},body:take.blob});
   audio=await response.json();if(!response.ok)throw Error(audio.error);
   const compare=document.createElement('a');compare.href=`/?audio=${encodeURIComponent(audio.id)}&compare=both`;compare.target='_blank';compare.rel='noopener';compare.textContent=tr('Toma guardada · comparar después con ambos motores');card.append(compare);
  }
  if(streamTake?.error)throw Error(streamTake.error);
  const state=await api('/api/state',undefined,controller.signal),config=state.configs.find(c=>engine==='whisper'?c.engine==='whisper'&&c.beams===1:c.id===configId);
  if(!config)throw Error(tr('No hay configuración base para el motor elegido.'));
  if(engine==='muse'&&!state.metaConfigured)throw Error(tr('Falta la clave de Meta: configúrala en el laboratorio.'));
  // Keep this response observable even if cancellation races with enqueue.
  if(streamTake){if(!streamTake.runId)throw Error(tr('No se recibió identificación del streaming.'));job.runId=streamTake.runId;}
  else{const queued=await api('/api/runs',{audioIds:[audio.id],configIds:[config.id],repeats:1,commandsEnabled,reviewEnabled,reviewContext});job.runId=queued.runIds[0];}
  take.trace.asr.runId=job.runId;
  if(controller.signal.aborted){await api('/api/cancel',{id:job.runId});throw Error(tr('Cancelado.'));}
  const deadline=performance.now()+360000;
  while(performance.now()<deadline){
   const state=await api('/api/state',undefined,controller.signal),run=state.runs.find(r=>r.id===job.runId);
   if(epoch!==generation)return;
   if(run?.status==='completed'){
    const finalText=run.formatting?.text??run.termFormatting?.text??run.numberFormatting?.text??run.text;
    text.textContent=finalText.trim()||(finalText.includes('\n')?tr('(Salto aplicado al informe.)'):tr('(El motor devolvió texto vacío.)'));
    await reportEditor.finish(reportAnchor,finalText,run.id);
    if(epoch!==generation)return;
    if(!isDemo)mountReview(card,run,{onChange:(old,next)=>epoch===generation&&reportEditor.review(reportAnchor,old,next)});
    showFigureDoubts(run.numberFormatting?.warnings??[]);
    const original=document.createElement('details'),summary=document.createElement('summary'),raw=document.createElement('pre');summary.textContent=tr('Ver transcripción original y comandos');raw.textContent=run.text;original.append(summary,raw);
    const report=document.createElement('p');report.className='tiny';report.textContent=run.formatting?tr`${run.formatting.events.length} comandos aplicados · ${run.formatting.elapsedMs.toFixed(2)} ms · ${run.formatting.warnings.length} dudas conservadas sin convertir. ${run.formatting.warnings.map(w=>w.command+tr(': posible uso literal o decimal')).join('; ')}`:tr('Comandos desactivados para esta toma.');report.textContent+=run.numberFormatting?tr` Números: ${run.numberFormatting.events.length} conversiones · ${run.numberFormatting.elapsedMs.toFixed(2)} ms · ${run.numberFormatting.warnings.length} dudas.`:'';report.textContent+=run.termFormatting?.events.length?tr` Términos: ${run.termFormatting.events.map(e=>`${e.spoken} → ${e.replacement}`).join('; ')}.`:'';original.append(report);card.append(original);
    if(run.formatting?.warnings.length||run.numberFormatting?.warnings.length){const warning=document.createElement('p');warning.className='tiny';warning.textContent=tr('Revisa las dudas de comandos: se conservaron palabras potencialmente literales o decimales.');card.append(warning);}
    // DOM update time, not a hardware measurement of screen presentation.
    const finalDomAt=performance.now();
    const {receiveEndToTextMs,receiveStartToFirstTextMs,receiveStartToFinalTextMs}=textIntervals({start:take.receivedStart,end:take.receivedEnd,final:finalDomAt,first:streamTake?.firstPartialMs==null?null:streamTake.started+streamTake.firstPartialMs,hasFinalText:!!finalText.trim()});
    const estimate=arrivalEstimate(take.stopStamp,take.stamp());
    const stopToTextEstimateMs=estimate?.usable?estimate.ms:null,clockUncertaintyMs=estimate?.uncertaintyMs??null;
    take.trace.asr={status:'completed',runId:run.id,engine,uiRevision:'numbers-live-v1',model:run.configuration.model,cold:run.result?.cold};
    for(const [key,value] of Object.entries({receiveStartToFinalTextMs,receiveStartToFirstTextMs,receiveEndToTextMs,stopToTextEstimateMs,clockUncertaintyMs,asrQueueMs:run.timings.queueMs,asrRunMs:run.timings.requestMs}))take.trace.stage(key,value);
    timing.textContent=tr`Detener → texto: ${stopToTextEstimateMs==null?tr('sin calibración'):tr`≈ ${seconds(stopToTextEstimateMs)} (resolución orientativa ${seconds(clockUncertaintyMs)})`} · fin recibido en PC → texto: ${seconds(receiveEndToTextMs)} · cola: ${seconds(run.timings.queueMs)} · motor: ${seconds(run.timings.requestMs)}${run.result?.cold?tr(' · primera carga del modelo'):''}`;
    take.renderMetrics();
    if(run.stream){take.trace.asr.streaming={...run.stream,events:undefined};take.trace.stage('startToFirstPartialMs',streamTake?.firstPartialMs);timing.textContent+=tr` · inicio recibido → primer borrador: ${seconds(streamTake?.firstPartialMs)} · conexión Meta: ${seconds(run.stream.handshakeMs)} · fin recibido en servidor → final: ${seconds(run.stream.endToFinalMs)} · revisiones: ${run.stream.revisionCount} · cierre: ${run.stream.segmentation??'manual'} · segmentos: ${run.stream.segmentCount??0}`;take.renderMetrics();}
    try{await api('/api/live-measurements',{runId:run.id,recordingId:take.recordingId,source:take.trace.source,receiveStartToFinalTextMs,receiveStartToFirstTextMs,receiveEndToTextMs,stopToTextEstimateMs,clockUncertaintyMs,startToFirstPartialMs:streamTake?.firstPartialMs});}catch{timing.textContent+=tr(' · No se pudo guardar esta medición; exporta las métricas de sesión.');}
    return;
   }
   if(run&&!['queued','running'].includes(run.status))throw Error(run.error?.includes('Muse HTTP 401')?tr('Meta rechazó la autenticación (401). Revisa que sea una clave activa de Meta Model API y vuelve a pegarla en Acceso a Meta del laboratorio; no hace falta reiniciar.'):run.error||run.status);
   text.textContent=streamTake?tr('Esperando el resultado final de Muse-streaming…'):run?.status==='running'?(engine==='muse'?tr('Transcribiendo con Muse en Meta…'):tr('Transcribiendo en tu GPU… La primera toma puede tardar mientras carga el modelo.')):tr('Esperando turno de transcripción…');
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  await api('/api/cancel',{id:job.runId});throw Error(tr('Tiempo de espera agotado.'));
 }catch(error){if(epoch===generation){reportEditor.cancel(reportAnchor);text.textContent=controller.signal.aborted?tr('Transcripción cancelada.'):tr`No se pudo transcribir: ${error.message}`;take.trace.asr={status:controller.signal.aborted?'cancelled':'error',runId:job.runId,engine,uiRevision:'commands-live-v1'};timing.textContent=tr`Fin recibido en PC → error/cancelación: ${seconds(performance.now()-take.receivedEnd)}`;take.renderMetrics();}}
 finally{if(streamTake){streams.delete(streamTake);if(!streamTake.done)streamTake.cancel();}takeSlot?.release();takeSlots.delete(reportAnchor);jobs.delete(job);cancel.remove();delete card.dataset.pending;trimTakeCards(panel);}
});

// Reveal only after the complete workspace has mounted successfully.
window.dispatchEvent(new window.Event('dicta-ready'));


// Direct pairing uses the original controls and transport, never a sample QR.
const scanHome=make('section','scan-home');
scanHome.setAttribute('aria-label','Conectar teléfono');
const scanTitle=make('h2','scan-title',tr('Escanea para dictar'));
const scanHint=make('p','scan-hint',tr('Escanea con la cámara de tu teléfono.'));
scanHint.append(make('span','scan-subhint',tr('Tu teléfono funciona como micrófono.')));
const writeInstead=make('button','write-without-phone',tr('Informe libre'));
writeInstead.type='button';
pairing.querySelector('#code').before(scanTitle,scanHint);scanHome.append(writeInstead);sheetHead.after(scanHome);
const readyHint=make('p','ready-hint',tr('Todo listo. Empieza a grabar desde tu teléfono.'));readyHint.setAttribute('role','status');readyHint.setAttribute('aria-live','polite');readyHint.hidden=true;reportEditor.element.before(readyHint);
let writeMode=false,startedThisReport=false,lastGuidanceState=null;
writeInstead.onclick=()=>{writeMode=true;syncScanHome();reportEditor.element.focus();};
const syncScanHome=()=>{
 const empty=reportEditor.element.dataset.empty==='true',pairedState=document.querySelector('#paired');
 const visible=empty&&pairedState.hidden&&!writeMode&&!startedThisReport;
 const ready=empty&&!pairedState.hidden&&pairedState.dataset.paused!=='true'&&!writeMode&&!startedThisReport&&!reportEditor.model.pending;
 readyHint.hidden=!ready;sheet.classList.toggle('ready-to-dictate',ready);
 const guidanceState=visible?'scan':ready?'ready':'none';if(guidanceState!==lastGuidanceState){track('guidance-state',{state:guidanceState});lastGuidanceState=guidanceState;}
 scanHome.hidden=!visible;sheet.classList.toggle('scan-first',visible);
 if(visible&&pairing.parentElement!==scanHome){pairing.removeAttribute('style');scanHome.prepend(pairing);connection.open=false;}
 else if(!visible&&pairing.parentElement===scanHome){connection.append(pairing);}
};
new MutationObserver(syncScanHome).observe(reportEditor.element,{attributes:true,attributeFilter:['data-empty']});
new MutationObserver(syncScanHome).observe(document.querySelector('#paired'),{attributes:true,attributeFilter:['hidden','data-paused']});
window.addEventListener('dicta-recording-start',()=>{startedThisReport=true;syncScanHome();});
reportEditor.element.addEventListener('input',()=>{startedThisReport=true;syncScanHome();});
reportEditor.element.addEventListener('report-new',()=>{writeMode=false;startedThisReport=false;syncScanHome();});
connection.querySelector('summary').addEventListener('click',e=>{if(!scanHome.hidden){e.preventDefault();scanHome.scrollIntoView({block:'center',behavior:'smooth'});if(!connectButton.disabled)connectButton.click();}});
syncScanHome();
// Compact actions retain accessible names and keyboard behavior.
for(const [selector,glyph] of [['.report-undo','↶'],['.report-redo','↷']]){const b=editbar.querySelector(selector);b.setAttribute('aria-label',b.textContent);b.title=b.textContent;b.textContent=glyph;}
const newReportControl=editbar.querySelector('.report-new');newReportControl.setAttribute('aria-label',tr('Nuevo informe'));newReportControl.textContent='+ '+(language()==='en'?'New':'Nuevo');
const templateSummary=templatePanel.querySelector('summary');templateSummary.textContent=language()==='en'?'Templates':'Plantillas';
newReportControl.before(templatePanel);
sizeControls.firstChild.textContent='';
for(const [i,b] of [...sizeControls.querySelectorAll('button')].entries()){b.title=b.getAttribute('aria-label');b.textContent=i?'＋':'−';}
const quickLabel=make('p','quick-template-label',tr('O empieza con una plantilla'));
reportEditor.quickTemplates.before(quickLabel);
const sheetFooter=make('footer','sheet-footer'),countLabel=make('span',''),connectionLabel=make('span','');sheetFooter.append(countLabel,connectionLabel);sheet.append(sheetFooter);
const updateFooterConnection=()=>{connectionLabel.textContent=document.querySelector('#paired').hidden?tr('Micrófono en espera'):document.querySelector('#paired').dataset.paused==='true'?tr('Teléfono en pausa'):tr('Teléfono conectado');};
new MutationObserver(updateFooterConnection).observe(document.querySelector('#paired'),{attributes:true,attributeFilter:['hidden','data-paused']});updateFooterConnection();
const updateCount=()=>{const text=reportEditor.model.text;countLabel.textContent=tr`${text.trim()?text.trim().split(/\s+/u).length:0} palabras · ${text.length} caracteres`;};
new MutationObserver(updateCount).observe(reportEditor.element,{childList:true,subtree:true,characterData:true});updateCount();

