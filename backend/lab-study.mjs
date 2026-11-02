import {randomUUID} from 'node:crypto';
import {hash,score} from './lab-core.mjs';

const categories=['negation','laterality','measure'];
const outcomes=['correct','substitution','deletion','insertion','unevaluable'];
const str=(v,max=8000)=>{if(typeof v!=='string'||v.length>max)throw Error('Texto de estudio inválido.');return v;};
const count=v=>{if(!Number.isInteger(v)||v<0||v>100000)throw Error('Conteo inválido.');return v;};
const duration=v=>{if(v===null)return null;if(!Number.isFinite(v)||v<0||v>86400000)throw Error('Duración inválida.');return v;};
const ratio=(a,b)=>b?a/b:null;
export function comparePair(a,b){
 if(!a||!b||a.id===b.id||a.status!=='completed'||b.status!=='completed')throw Error('Selecciona dos ejecuciones terminadas distintas.');
 if(!a.audioId||a.audioId!==b.audioId||(a.audioHash&&b.audioHash&&a.audioHash!==b.audioHash))throw Error('El par debe usar exactamente el mismo audio.');
 if((a.configuration.mode??'file')!==(b.configuration.mode??'file'))throw Error('Compara el mismo modo; archivo y streaming tienen intervalos diferentes.');
 if(a.result?.cold!=null&&b.result?.cold!=null&&a.result.cold!==b.result.cold)throw Error('Separa carga fría, caliente y no observable.');
 if(a.evaluationReferenceVersion!==b.evaluationReferenceVersion)throw Error('El par requiere la misma versión de referencia.');
 const delta=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)?y-x:null;
 return {schema:'lab-pair-v1',direction:'B minus A; lower is better for these metrics',a:a.id,b:b.id,audioId:a.audioId,referenceVersion:a.evaluationReferenceVersion??null,conditions:{mode:a.configuration.mode??'file',aCold:a.result?.cold??null,bCold:b.result?.cold??null},delta:{wer:delta(a.evaluation?.wer,b.evaluation?.wer),cer:delta(a.evaluation?.cer,b.evaluation?.cer),requestMs:delta(a.timings.requestMs,b.timings.requestMs),endToFinalMs:delta(a.stream?.endToFinalMs,b.stream?.endToFinalMs)},runs:[a,b],note:'Par explícito exploratorio; red/dispositivo desconocidos no prueban condiciones equivalentes.'};
}
export function clinicalSummary(rows){return Object.fromEntries(categories.map(category=>{
 const r=rows.filter(x=>x.category===category),n=r.filter(x=>!['insertion','unevaluable'].includes(x.outcome)).length;
 const counts=Object.fromEntries(outcomes.map(k=>[k,r.filter(x=>x.outcome===k).length]));
 return [category,{...counts,opportunities:n,accuracy:ratio(counts.correct,n),errorRate:ratio(counts.substitution+counts.deletion,n)}];
}));}
export function studyCsv(rows){const keys=['id','kind','runId','stage','reviewId','createdAt','evaluator','elapsedMs','inputEvents','status','snapshotHash','referenceVersion','wer','cer','summary'];
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,'\t$&').replaceAll('"','""')+'"';
 return [keys.join(','),...rows.map(r=>keys.map(k=>cell(k==='summary'?JSON.stringify(r.summary):r[k]??r.evaluation?.[k])).join(','))].join('\r\n');}

export function createStudy({db,save,build,sourceHash}){
 db.studyRecords??=[];
 function snapshot(m){
  const run=db.runs.find(r=>r.id===m.runId&&r.status==='completed');if(!run)throw Error('Ejecución terminada requerida.');
  let text,revision=null;
  if(m.stage==='asr')text=run.text;
  else if(m.stage==='formatted')text=run.formatting?.text??run.numberFormatting?.text??run.text;
  else if(m.stage==='reviewed'){const d=db.reviewDocuments.find(d=>d.runId===run.id);if(!d)throw Error('No hay texto revisado.');text=d.text;revision=d.revision;}
  else if(m.stage==='edited'){const d=db.studyRecords.find(d=>d.id===m.editId&&d.kind==='editing'&&d.runId===run.id&&d.status==='approved');if(!d)throw Error('Edición aprobada requerida.');text=d.finalText;revision=d.id;}
  else throw Error('Etapa desconocida.');
  const snapshotHash=hash(Buffer.from(text));if(m.snapshotHash&&m.snapshotHash!==snapshotHash)throw Error('El texto cambió: vuelve a cargar el objetivo.');
  const ref=db.audios.find(a=>a.id===run.audioId)?.references.at(-1)??null;
  if(Object.hasOwn(m,'expectedReferenceVersion')&&m.expectedReferenceVersion!==(ref?.version??null))throw Error('La referencia cambió: vuelve a cargar el objetivo.');
  return {runId:run.id,configuration:structuredClone(run.configuration??null),runBuild:run.build??null,runSourceHash:run.sourceHash??null,runEnvironment:structuredClone(run.environment??null),originalAsr:run.text,reviewDocument:m.stage==='reviewed'?structuredClone(db.reviewDocuments.find(d=>d.runId===run.id)):null,audioId:run.audioId,audioHash:run.audioHash??null,stage:m.stage,text,snapshotHash,revision,reference:structuredClone(ref),referenceVersion:ref?.version??null};
 }
 function append(m){
  if(m.syntheticOnly!==true)throw Error('Este estudio admite solo contenido sintético.');
  const evaluator=str(m.evaluator,40);if(!/^[A-Za-z0-9_-]{1,40}$/.test(evaluator))throw Error('Usa un código de evaluador, sin datos personales.');
  if(m.clientId&&db.studyRecords.some(r=>r.clientId===m.clientId))return db.studyRecords.find(r=>r.clientId===m.clientId);
  const base={id:randomUUID(),clientId:m.clientId?str(m.clientId,80):null,version:'lab-study-v1',createdAt:new Date().toISOString(),kind:m.kind,evaluator,syntheticOnly:true,build,sourceHash,environment:{browser:m.browser?str(m.browser,500):null,device:m.device?str(m.device,120):null,network:m.network?str(m.network,120):null,reportedBy:'participant',clockResolutionMs:null,instrumentationOverheadMs:null}};
  let r;
  if(m.kind==='clinical'){
   const target=snapshot(m);if(!Array.isArray(m.rows)||!m.rows.length||m.rows.length>200)throw Error('Añade 1–200 oportunidades.');
   const seen=new Set();const rows=m.rows.map(x=>{const id=str(x.id,80);if(!id||seen.has(id))throw Error('ID de oportunidad duplicado o vacío.');seen.add(id);if(!categories.includes(x.category)||!outcomes.includes(x.outcome))throw Error('Anotación inválida.');return {id,category:x.category,outcome:x.outcome,expected:str(x.expected,500),observed:str(x.observed,500)};});
   r={...base,...target,rows,summary:clinicalSummary(rows),annotationRole:['independent','adjudication'].includes(m.annotationRole)?m.annotationRole:'independent'};
  }else if(m.kind==='editing'){
   const target=snapshot(m);if(!['approved','abandoned'].includes(m.status))throw Error('Estado inválido.');
   const finalText=str(m.finalText);r={...base,...target,finalText,status:m.status,elapsedMs:duration(m.elapsedMs),inputEvents:count(m.inputEvents),hiddenCount:count(m.hiddenCount),order:m.order??null,blinding:'UI hides engine; not guaranteed',evaluation:m.status==='approved'?score(target.reference?.text??null,finalText):null};
  }else if(m.kind==='review'){
   const review=db.reviews.find(x=>x.id===m.reviewId&&x.runId===m.runId&&x.status==='completed');if(!review)throw Error('Revisión terminada requerida.');
   const target=snapshot({...m,stage:'reviewed'});
   const beforeErrors=count(m.beforeErrors),detected=count(m.detected),corrected=count(m.corrected),introduced=count(m.introduced),residual=count(m.residual);
   if(detected>beforeErrors||corrected>beforeErrors)throw Error('Detectados/corregidos exceden errores previos.');
   if(!Array.isArray(m.verdicts)||m.verdicts.length!==review.suggestions.length)throw Error('Evalúa cada propuesta, incluida no evaluable.');
   const ids=new Set();const verdicts=m.verdicts.map(v=>{if(ids.has(v.id)||!review.suggestions.some(s=>s.id===v.id)||!['correct','incorrect','unevaluable'].includes(v.verdict))throw Error('Juicio de propuesta inválido.');ids.add(v.id);return {id:v.id,verdict:v.verdict};});
   const assessed=verdicts.filter(v=>v.verdict!=='unevaluable'),correct=assessed.filter(v=>v.verdict==='correct').length;
   r={...base,...target,reviewId:review.id,beforeText:review.baseText,reviewSnapshot:structuredClone(review),verdicts,beforeErrors,detected,corrected,introduced,residual,summary:{precision:ratio(correct,assessed.length),sensitivity:ratio(detected,beforeErrors),corrected,introduced,residual,missed:beforeErrors-detected}};
  }else if(m.kind==='usability'){
   if(!/^[A-H]$/.test(m.task)||!['success','failed','abandoned'].includes(m.status))throw Error('Tarea/estado inválido.');
   r={...base,task:m.task,variant:str(m.variant,80),status:m.status,elapsedMs:duration(m.elapsedMs),clicks:count(m.clicks),errors:count(m.errors),hiddenCount:count(m.hiddenCount),viewport:m.viewport??null};
  }else throw Error('Tipo de estudio desconocido.');
  db.studyRecords.push(r);save();return r;
 }
 return {snapshot,append};
}
