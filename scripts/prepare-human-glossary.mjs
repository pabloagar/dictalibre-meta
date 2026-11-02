// Local conversion only. Does not send audio, infer, validate references or publish.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {plan} from './human-glossary-input.mjs';
import {hash} from '../backend/lab-core.mjs';
const [inputArg,outArg]=process.argv.slice(2);if(!inputArg||!outArg)throw Error('Pass extracted input directory and NEW private output directory');
const input=path.resolve(inputArg),out=path.resolve(outArg),privateRoot=path.resolve('data/local');
const relative=path.relative(privateRoot,out);if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Output must be a new directory under data/local');
if(fs.existsSync(out))throw Error('Never overwrite evidence');
const files=fs.readdirSync(input);
const sources=plan.cases.map(c=>{const matches=files.filter(f=>new RegExp('^'+c.id+'\\.(m4a|wav|mp3|aac)$','i').test(f));if(matches.length!==1)throw Error('Require one audio for '+c.id);return {...c,sourceFile:matches[0]};});
const ffmpegVersion=execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split(/\r?\n/)[0];
fs.mkdirSync(out);
const manifest={schema:'human-glossary-corpus-v1',source:'human voice, fictional scripts',createdAt:new Date().toISOString(),planHash:hash(fs.readFileSync(new URL('../tests/fixtures/human-glossary-plan.json',import.meta.url))),referenceValidated:false,conditions:{device:null,recorder:null,microphone:null,environment:null,browser:null,network:null},conversion:{ffmpegVersion,operations:'decode, mono mix and resample PCM16 16kHz only; no trim/denoise/gain'},cases:[]};
try{
 for(const c of sources){
  const originalFile=c.id+'-original'+path.extname(c.sourceFile).toLowerCase(),file=c.id+'.wav';
  fs.copyFileSync(path.join(input,c.sourceFile),path.join(out,originalFile),fs.constants.COPYFILE_EXCL);
  execFileSync('ffmpeg',['-nostdin','-v','error','-n','-i',path.join(out,originalFile),'-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',path.join(out,file)]);
  manifest.cases.push({id:c.id,baseId:c.id,category:Number(c.id)>10?'control':'target',voice:'human-01',terms:c.terms,plannedScript:c.script,script:null,expectedFormatted:null,referenceValidated:false,referenceConfirmation:null,file,sha256:hash(fs.readFileSync(path.join(out,file))),originalFile,originalSha256:hash(fs.readFileSync(path.join(out,originalFile)))});
 }
}finally{fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');}
console.log('Prepared locally; references remain unconfirmed: '+out);
