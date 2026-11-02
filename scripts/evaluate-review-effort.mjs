import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {loadMetaKey} from '../backend/meta-key.mjs';
import {REPORT_PROMPT,validateReportEvidence} from '../backend/review-context.mjs';
import {validateReview} from '../backend/meta-review.mjs';
const efforts=process.argv.slice(2);if(!efforts.length)efforts.push('low','high');if(efforts.some(e=>!['low','medium','high'].includes(e)))throw Error('Invalid effort');
const cases=[
{id:'clean',text:'Pulmones bien expandidos. No se observa derrame pleural ni neumotórax.',expect:'no warnings'},
{id:'side',text:'Hallazgos: nódulo único en el lóbulo superior derecho. Conclusión: ese nódulo único está en el lóbulo superior izquierdo.',expect:'contradiction, no replacement'},
{id:'unit',text:'Engrosamiento de 24 mili. Milímetros de espesor.',expect:'minimal format proposal preserving 24'},
{id:'deformed',text:'Se describe una lesión de siete milimetrijilos.',expect:'warning of ambiguous unit, no invented finding'}
];
const out='data/local/review-effort-'+Date.now();fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/protocol.json',JSON.stringify({build:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),model:'muse-spark-1.3',variants:efforts,max_completion_tokens:8000,timeoutMs:90000,prompt:REPORT_PROMPT,cases,hypothesis:'Higher effort improves actionable review without false positives or unsafe replacements',repetitions:1,metrics:['validated suggestions','false positives on clean','protected changes','request ms','tokens'],acceptance:'clean remains empty; side detected; unit proposal actionable; no invented measurements; compare without assuming higher cost means better',device:null,browser:null,network:null,clockPrecision:null,overhead:null},null,2));
const results=[];const key=loadMetaKey('.env.local');
for(let i=0;i<cases.length;i++)for(const effort of (i%2?[...efforts].reverse():efforts)){
 const c=cases[i],start=performance.now();let row={case:c.id,effort};
 try{const r=await fetch('https://api.meta.ai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({model:'muse-spark-1.3',reasoning_effort:effort,max_completion_tokens:8000,response_format:{type:'json_object'},messages:[{role:'developer',content:REPORT_PROMPT},{role:'user',content:JSON.stringify({reviewScope:'report',formattedText:c.text,context:{templateName:'TC tórax'}})}]})});
 const data=await r.json();row={...row,status:r.status,elapsedMs:performance.now()-start,usage:data.usage,finish:data.choices?.[0]?.finish_reason,raw:data.choices?.[0]?.message?.content};
 if(r.ok)row.suggestions=validateReportEvidence(row.raw,c.text,validateReview);else row.error=data.error?.message;
 }catch(e){row.error=e.message;row.elapsedMs=performance.now()-start;}
 results.push(row);fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(row));
}
console.log('Evidence: '+out);
