import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';
import {loadMetaKey} from '../backend/meta-key.mjs';import {hash} from '../backend/lab-core.mjs';
const before=path.resolve('.runtime/mvp-eval-source'),after=path.resolve(process.argv[2]??'.');
const build=process.argv[3];if(!/^[a-f0-9]{40}$/.test(build??''))throw Error('Exact candidate commit required.');
for(const f of ['backend/review-context.mjs','backend/meta-review.mjs','backend/number-format.mjs','backend/dictation-commands.mjs','backend/spoken-colon.mjs'])if(hash(fs.readFileSync(path.join(after,f)))!==hash(execFileSync('git',['show',build+':'+f])))throw Error('Candidate mismatch '+f);
const oldModule=await import(pathToFileURL(path.join(before,'backend/meta-review.mjs'))),newModule=await import(pathToFileURL(path.join(after,'backend/meta-review.mjs')));
const {applyFormatting}=await import(pathToFileURL(path.join(after,'backend/format-pipeline.mjs')));
const baselineBytes=fs.readFileSync('data/local/lab/reports/mvp-evaluation-1793644425774/results.json'),baseline=JSON.parse(baselineBytes);
const controls=[
 {id:'isolated',expect:false,text:'HALLAZGOS\nSe identifica un quiste renal simple.'},
 {id:'not-repeated',expect:false,text:'HALLAZGOS\nTráquea centrada. Pulmones expandidos.\nIMPRESIÓN\nSin derrame pleural.'},
 {id:'different-structures',expect:false,text:'HALLAZGOS\nLóbulo tiroideo derecho de 42 × 14 × 15 mm. Lóbulo izquierdo de 40 × 13 × 14 mm.\nIMPRESIÓN\nMedidas tiroideas descritas.'},
 {id:'compatible',expect:false,text:'HALLAZGOS\nHígado de tamaño conservado con aumento difuso de su ecogenicidad.\nIMPRESIÓN\nEsteatosis hepática. Sin hepatomegalia.'},
 {id:'prior-current',expect:false,text:'COMPARACIÓN\nEn el estudio previo, el nódulo medía 4 mm.\nHALLAZGOS\nActualmente, el mismo nódulo mide 6 mm.\nIMPRESIÓN\nAumento del tamaño del nódulo de 4 a 6 mm.'},
 {id:'side-conflict',expect:true,text:'HALLAZGOS\nÚnico quiste renal de 12 mm en el riñón derecho.\nIMPRESIÓN\nQuiste renal único de 12 mm en el riñón izquierdo.'},
 {id:'polarity-conflict',expect:true,text:'HALLAZGOS\nNo se observa derrame pleural.\nIMPRESIÓN\nDerrame pleural derecho.'},
 {id:'size-conflict',expect:true,text:'HALLAZGOS\nÚnico nódulo del lóbulo tiroideo derecho de 5 mm.\nIMPRESIÓN\nNódulo único del lóbulo tiroideo derecho de 50 mm.'},
 {id:'term-control',expect:true,text:'HALLAZGOS\nSe identifica ate lectacia laminar basal izquierda.'},
 {id:'inherited-normality',expect:true,text:'HALLAZGOS\nNo se identifican lesiones focales hepáticas. Lesión focal hepática de 18 mm en el segmento VI.\nIMPRESIÓN\nLesión focal hepática de 18 mm.'}
];
const output=path.resolve('data/local/lab/reports/mvp-corrections-'+Date.now());fs.mkdirSync(output,{recursive:true});
const write=(file,data)=>fs.writeFileSync(path.join(output,file),JSON.stringify(data,null,2));
write('protocol.json',{schema:'mvp-corrections-paired-v1',createdAt:new Date().toISOString(),beforeBuild:'ecf0da79ba76dac272eadf721bf01adeed316999',afterBuild:build,baselineHash:hash(baselineBytes),scriptHash:hash(fs.readFileSync(new URL(import.meta.url))),protocolHash:hash(fs.readFileSync('tests/MVP_CORRECTIONS_PROTOCOL.md')),controls,conditions:{repetitions:1,browser:null,device:null,network:null,audioSource:null,clockResolutionMs:null,instrumentationOverheadMs:null},comparison:'same baseline ASR text through new formatter; same baseline formatted text with new reviewer vs stored previous review; new synthetic controls old/new reviewers in alternating order'});
console.log('Comparison: '+output);
const formatted=baseline.map(r=>{const next=structuredClone(r.run);applyFormatting(next);return {caseId:r.caseId,asr:r.run.text,before:r.formatted,after:next.formatting.text,expected:r.expectedFormatted,events:{numbers:next.numberFormatting.events,commands:next.formatting.events}};});write('formatting.json',formatted);
const key=loadMetaKey('.env.local'),oldDb={runs:[],reviews:[]},newDb={runs:[],reviews:[]};
const oldQ=oldModule.createReviewer({db:oldDb,save(){},getKey:()=>key,build:'ecf0da79ba76dac272eadf721bf01adeed316999',sourceHash:null});
const newQ=newModule.createReviewer({db:newDb,save(){},getKey:()=>key,build,sourceHash:null});
const review=async(q,text)=>{const r=q.enqueueReport({text});while(['running','queued'].includes(r.status))await new Promise(r=>setTimeout(r,250));return structuredClone(r);};
const same=[],paired=[];
try{
 for(const r of baseline){const next=await review(newQ,r.formatted);same.push({caseId:r.caseId,text:r.formatted,before:r.review,after:next});write('same-text-reviews.json',same);console.log(JSON.stringify({baseline:r.caseId,status:next.status,before:r.review.suggestions.length,after:next.suggestions.length}));}
 for(const [i,c] of controls.entries()){
  const row={...c};for(const v of i%2?['after','before']:['before','after'])row[v]=await review(v==='before'?oldQ:newQ,c.text);
  paired.push(row);write('controls.json',paired);console.log(JSON.stringify({control:c.id,expectNotice:c.expect,before:row.before.suggestions.length,after:row.after.suggestions.length,status:row.after.status}));
 }
 write('completion.json',{createdAt:new Date().toISOString(),baselineCases:same.length,controls:paired.length,uniqueNewReviews:newDb.reviews.length,uniqueOldReviews:oldDb.reviews.length});
}finally{oldQ.close();newQ.close();}
