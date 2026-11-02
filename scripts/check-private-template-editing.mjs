// Local-only integration over the owner's catalogue. Publishes counts/hashes, never template text.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hash} from '../backend/lab-core.mjs';
import {ReportModel,takeContext} from '../apps/shared/report-model.js';
import {reviewContext} from '../backend/review-context.mjs';
const file=path.resolve('data/local/templates/catalog.json'),bytes=fs.readFileSync(file),catalog=JSON.parse(bytes);
const output=path.resolve('data/local/lab/reports/template-editing-'+Date.now());fs.mkdirSync(output,{recursive:true});
const protocol={hypothesis:'Applied templates retain all unselected content; selected dictation replacement, undo/redo and context extraction are reversible. Template normality is not silently removed.',acceptance:'Each template passes exact string equality, undo/redo and no full base-template text in review context.',catalogHash:hash(bytes),count:catalog.templates.length,source:'private catalogue, local only',audioSource:null,network:null,browser:null,repetitions:1,clinicalValidation:false};
fs.writeFileSync(path.join(output,'protocol.json'),JSON.stringify(protocol,null,2));
const rows=[];
for(const t of catalog.templates){
 const started=performance.now();let error=null;
 try{
  const m=new ReportModel();m.reset(t.text);m.templateContext={...t,imported:true};
  assert.equal(m.text,t.text);
  const line=t.text.split('\n').find(s=>s.trim().length>20)??t.text;
  const start=t.text.indexOf(line),end=start+line.length;
  m.begin('synthetic',start,end);m.preview('synthetic','BORRADOR SINTÉTICO');assert.equal(m.committed(),t.text);
  const replacement='CASO SINTÉTICO: lesión de 5 mm en el lado derecho.';m.finish('synthetic',replacement);
  assert.equal(m.text,t.text.slice(0,start)+replacement+t.text.slice(end));
  m.undo();assert.equal(m.text,t.text);assert.equal(m.templateContext.name,t.name);m.redo();assert.equal(m.text,t.text.slice(0,start)+replacement+t.text.slice(end));
  const c=reviewContext(takeContext({template:m.templateContext,text:m.text,position:start}));assert.equal(c.templateText,undefined);assert.equal(c.templateOrigin,'importada');assert.equal(c.reportText,'');
  m.reset();assert.equal(m.text,'');m.undo();assert.ok(m.text.includes(replacement));
 }catch(e){error=e.message;}
 rows.push({templateHash:hash(Buffer.from(t.text)),category:t.category??null,passed:error===null,error,elapsedMs:performance.now()-started});
}
const result={...protocol,checks:rows,passed:rows.filter(r=>r.passed).length,failed:rows.filter(r=>!r.passed).length,clockResolutionMs:null,instrumentationOverheadMs:null,limits:'Model integration, not physical/browser usability; no private template was sent to Meta. Normality outside the selected range remains and must be checked.'};
fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({output,count:rows.length,passed:result.passed,failed:result.failed}));if(result.failed)process.exitCode=1;
