import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const dir=path.resolve(process.argv[2]??'');
if(!process.argv[2])throw Error('Pass evidence directory');
const read=f=>JSON.parse(fs.readFileSync(path.join(dir,f)));
const hash=f=>createHash('sha256').update(fs.readFileSync(path.join(dir,f))).digest('hex');
const p=read('protocol.json'),rows=read('results.json'),completion=read('completion.json');
if(p.schema!=='dictation-breadth-evaluation-v1'||rows.length!==49||completion.runs!==49||new Set(rows.map(r=>r.caseId)).size!==49)throw Error('Incomplete or duplicate results');
// A spoken punctuation command is not an extra medical term when ASR emits its symbol.
// Keep the original counters in results.json; recompute only this reporting metric.
const norm=s=>(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const vocabulary=new Set(p.cases.flatMap(c=>c.terms??[]).map(norm).filter(w=>w!=='coma'));
for(const r of rows){
  const terms=s=>(norm(s).match(/[a-z]+/g)??[]).filter(w=>vocabulary.has(w)||(r.caseId.endsWith('literal-coma')&&w==='coma'));
  r.termMatch=r.status==='completed'&&JSON.stringify(terms(r.script))===JSON.stringify(terms(r.text));
  r.formattedTermMatch=r.status==='completed'&&JSON.stringify(terms(r.script))===JSON.stringify(terms(r.formatted));
}
const tally=rs=>({runs:rs.length,completed:rs.filter(r=>r.status==='completed').length,exactFormatted:rs.filter(r=>r.exactMatch).length,rawTermSequence:rs.filter(r=>r.termMatch).length,formattedTermSequence:rs.filter(r=>r.formattedTermMatch).length,rawPolarityLaterality:rs.filter(r=>r.protectedMatch).length,formattedPolarityLaterality:rs.filter(r=>r.formattedProtectedMatch).length,formattedQuantitiesUnits:rs.filter(r=>r.quantityMatch).length});
const summary={schema:'dictation-breadth-summary-v1',build:p.build,protocolHash:hash('protocol.json'),resultsHash:hash('results.json'),sourceHashes:p.sourceHashes,configuration:{model:p.model,variants:p.variants,segmentation:p.segmentation},referencesHumanValidated:false,distinctScripts:24,voices:p.conditions.voices,repetitions:1,total:tally(rows),byVoice:Object.fromEntries(p.conditions.voices.map(v=>[v,tally(rows.filter(r=>r.voice===v))])),byCategory:Object.fromEntries([...new Set(rows.map(r=>r.category))].map(c=>[c,tally(rows.filter(r=>r.category===c))])),silence:rows.filter(r=>r.caseId==='digital-silence').map(r=>({status:r.status,empty:r.status==='completed'&&!(r.text??'').trim()})),differences:rows.filter(r=>!r.exactMatch||!r.termMatch||!r.protectedMatch||!r.quantityMatch).map(r=>({caseId:r.caseId,status:r.status,script:r.script,raw:r.text,expected:r.expectedFormatted,formatted:r.formatted,rawTermsCorrect:r.termMatch,rawPolarityLateralityCorrect:r.protectedMatch,formattedQuantitiesUnitsCorrect:r.quantityMatch})),exploratoryGatePassed:rows.every(r=>r.status==='completed'&&r.termMatch&&r.formattedTermMatch&&r.protectedMatch&&r.formattedProtectedMatch&&r.quantityMatch)&&rows.filter(r=>r.caseId==='digital-silence').every(r=>!(r.text??'').trim()),productionChanges:false,limits:['Synthetic es-ES voices; input scripts are provisional references, not human-listened truth.','Mechanical term/marker/quantity checks are not complete semantic or clinical adjudication.','One run per WAV; no confidence interval or causal comparison with prior corpora.','Separate local server, shared provider account; no phone latency claims.','Exact text differences include harmless spelling/punctuation and substantive errors; inspect full differences.']};
summary.scorerHash=createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex');
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({total:summary.total,byCategory:summary.byCategory,gate:summary.exploratoryGatePassed,differences:summary.differences},null,2));
