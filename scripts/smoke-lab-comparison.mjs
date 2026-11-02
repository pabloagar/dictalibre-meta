// Explicit real-engine smoke: synthetic audio only. Provisional script references, no human validation.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {hash,score,csv} from '../backend/lab-core.mjs';
const base='http://127.0.0.1:8789',dir=path.resolve('data/local/study-corpus-v1-utf8');
const output=path.resolve('data/local/lab/reports/lab-acceptance-'+Date.now());fs.mkdirSync(output,{recursive:true});
const write=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2));
async function api(p,data){const res=await fetch(base+p,data===undefined?{}:{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await res.json();if(!res.ok)throw Error(value.error);return value;}
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8').replace(/^\uFEFF/,''));
const chosen=['case-01-clean','case-03-clean','case-05-clean'].map(id=>manifest.cases.find(c=>c.id===id));
if(chosen.some(c=>!c))throw Error('Corpus incomplete.');
const state=await api('/api/state');
const configs=['muse','whisper'].map(engine=>state.configs.find(c=>c.engine===engine&&c.version===1&&!c.keywords.length&&(engine!=='whisper'||c.beams===1)));
if(configs.some(c=>!c)||!state.metaConfigured||!state.modelPresent)throw Error('Missing engine/configuration.');
if(state.runs.some(r=>['queued','running'].includes(r.status)))throw Error('Lab busy.');
const protocol={schema:'lab-real-smoke-v1',createdAt:new Date().toISOString(),hypothesis:'Current lab can compare two real engines on identical synthetic PCM, retain outcomes and export verifiable lexical/timing metrics.',acceptance:['six terminal runs, all completed for inference acceptance','WER/CER match deterministic rescoring against provisional TTS scripts','review completes and original ASR remains immutable','paired and CSV exports preserve missing values'],headObserved:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),serverBuild:state.build,serverSourceHash:state.sourceHash,scriptHash:hash(fs.readFileSync(new URL(import.meta.url))),configurations:configs,conditions:{repeats:1,mode:'file',commandsEnabled:true,numbersEnabled:true,reviewEnabled:false,order:'backend alternates by audio',network:null,browser:null,captureDevice:null,audioSource:'System.Speech synthetic TTS',voice:manifest.voice,culture:manifest.culture,referenceOrigin:'TTS input script; NOT human listened/validated',referenceValidated:false,clockResolutionMs:null,instrumentationOverheadMs:null},cases:chosen};
write('protocol.json',protocol);console.log('Protocol saved: '+output);
const audioIds=[],mapping=[];let queued;
try{
 for(const c of chosen){const bytes=fs.readFileSync(path.join(dir,c.file));if(hash(bytes)!==c.sha256)throw Error('Corpus hash mismatch');const response=await fetch(base+'/api/audio',{method:'POST',headers:{Origin:base,'Content-Type':'audio/wav','X-File-Name':encodeURIComponent('SINTÉTICO · referencia provisional · '+c.id+'.wav')},body:bytes});const a=await response.json();if(!response.ok)throw Error(a.error);
  if(a.references.length&&a.references.at(-1).text!==c.script)throw Error('Existing different reference: preserve without overwrite.');
  if(!a.references.length)await api('/api/references',{audioId:a.id,text:c.script});audioIds.push(a.id);mapping.push({caseId:c.id,audioId:a.id,hash:a.sha256,referenceOrigin:protocol.conditions.referenceOrigin});
 }write('mapping.json',mapping);
 queued=await api('/api/runs',{audioIds,configIds:configs.map(c=>c.id),repeats:1,commandsEnabled:true,numbersEnabled:true,reviewEnabled:false});write('enqueue.json',queued);
 const deadline=performance.now()+600000;let runs=[];
 while(performance.now()<deadline){const s=await api('/api/state');runs=s.runs.filter(r=>queued.runIds.includes(r.id));if(runs.length===6&&runs.every(r=>!['queued','running'].includes(r.status)))break;await new Promise(r=>setTimeout(r,1500));}
 write('runs.json',runs);fs.writeFileSync(path.join(output,'runs.csv'),csv(runs));
 const checks=runs.map(r=>({id:r.id,status:r.status,engine:r.configuration.engine,caseId:mapping.find(m=>m.audioId===r.audioId)?.caseId,metricsMatch:JSON.stringify(r.evaluation)===JSON.stringify(score(r.referenceAtRun?.text??null,r.text??'')),requestMs:r.timings.requestMs,totalMs:r.timings.totalMs,requestRtf:r.timings.requestRtf??null,cold:r.result?.cold??null,wer:r.evaluation?.wer??null,cer:r.evaluation?.cer??null,error:r.error}));
 const pairs=[];for(const audioId of audioIds){const a=runs.find(r=>r.audioId===audioId&&r.configuration.engine==='muse'),b=runs.find(r=>r.audioId===audioId&&r.configuration.engine==='whisper');if(a?.status==='completed'&&b?.status==='completed')pairs.push(await api('/api/study/compare',{a:a.id,b:b.id}));}write('pairs.json',pairs);
 const reviewRun=runs.find(r=>r.configuration.engine==='muse'&&r.status==='completed');let review=null;
 if(reviewRun){write('review-protocol.json',{runId:reviewRun.id,hypothesis:'Review preserves original ASR and returns a separately traceable outcome.',repetitions:1,humanQualityVerdict:null,input:reviewRun.formatting?.text??reviewRun.text});review=await api('/api/reviews',{runId:reviewRun.id});const reviewDeadline=performance.now()+180000;while(['queued','running'].includes(review.status)&&performance.now()<reviewDeadline){await new Promise(r=>setTimeout(r,1500));review=(await api('/api/state')).reviews.find(r=>r.id===review.id);}write('review.json',review);}
 const after=await api('/api/state');const originalsPreserved=runs.every(r=>after.runs.find(x=>x.id===r.id)?.text===r.text);
 const summary={acceptanceScope:'Inference and review; export acceptance additionally requires verify-lab-smoke-export.py',createdAt:new Date().toISOString(),output,checks,pairs:pairs.length,originalsPreserved,review:review?{id:review.id,status:review.status,suggestionCount:review.suggestions.length,requestMs:review.timings.requestMs,qualityVerdict:null}:null,accepted:checks.length===6&&checks.every(c=>c.status==='completed'&&c.metricsMatch)&&pairs.length===3&&originalsPreserved&&review?.status==='completed',referenceValidated:false};write('summary.json',summary);console.log(JSON.stringify(summary,null,2));if(!summary.accepted)process.exitCode=1;
}catch(e){write('failure.json',{message:e.message,queued:queued??null,mapping});console.error(e.message);process.exitCode=1;}
