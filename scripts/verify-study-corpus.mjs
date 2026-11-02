import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {wavInfo,hash} from '../backend/lab-core.mjs';
const dirs=process.argv.slice(2);if(!dirs.length)throw Error('Indica directorios de corpus para verificar.');
const start=performance.now(),checks=[];
for(const dir of dirs){const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8').replace(/^\uFEFF/,''));for(const c of manifest.cases){const bytes=fs.readFileSync(path.join(dir,c.file));if(hash(bytes)!==c.sha256)throw Error('Hash incorrecto: '+c.id);const w=wavInfo(bytes);checks.push({id:c.id,baseId:c.baseId,sha256:c.sha256,durationMs:w.durationMs,sampleRate:w.sampleRate,channels:w.channels,variant:c.variant,snrMeasuredDb:c.snrMeasuredDb??null,referenceValidated:c.referenceValidated});}}
const elapsedMs=performance.now()-start;
const sourceFiles=['backend/lab-study.mjs','backend/lab-core.mjs','backend/lab.mjs','apps/lab/study.js','apps/shared/lab-timing.js','scripts/build-study-corpus.ps1','scripts/study-noise.mjs'];
const out={schema:'lab-corpus-verification-v1',createdAt:new Date().toISOString(),headObserved:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(sourceFiles.map(f=>[f,hash(fs.readFileSync(f))])),environment:{os:process.platform,node:process.version,browser:null,network:null,audioSource:'System.Speech local synthetic TTS'},repetitions:1,elapsedMs,interval:'start reading manifests through all hash/WAV checks, excluding report writing',instrumentationOverheadMs:null,clockResolutionMs:null,distinctBaseCount:new Set(checks.map(c=>c.baseId)).size,checks};
const baseDest='experiments/results/2026-11-02-lab-extension/corpus-verification.json';const dest=fs.existsSync(baseDest)?baseDest.replace('.json','-'+Date.now()+'.json'):baseDest;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(out,null,2));console.log(`${checks.length} WAV verificados / ${out.distinctBaseCount} frases base. ${elapsedMs.toFixed(2)} ms. ${dest}`);
