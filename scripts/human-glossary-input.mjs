import fs from 'node:fs';
import path from 'node:path';
import {hash,wavInfo} from '../backend/lab-core.mjs';
export const plan=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/human-glossary-plan.json',import.meta.url),'utf8'));
export function validateHumanManifest(manifest,dir){
 if(manifest.schema!=='human-glossary-corpus-v1'||manifest.planHash!==hash(fs.readFileSync(new URL('../tests/fixtures/human-glossary-plan.json',import.meta.url))))throw Error('Plan mismatch');
 if(manifest.cases?.length!==12||new Set(manifest.cases.map(c=>c.id)).size!==12)throw Error('Require 12 distinct cases');
 if(manifest.source!=='human voice, fictional scripts'||manifest.referenceValidated!==true)throw Error('Human confirmation required');
 for(const c of manifest.cases){
  if(!plan.cases.some(p=>p.id===c.id)||c.referenceValidated!==true||!c.referenceConfirmation?.trim()||!c.script?.trim()||!c.expectedFormatted?.trim())throw Error('Unconfirmed reference '+c.id);
  for(const [name,digest] of [[c.file,c.sha256],[c.originalFile,c.originalSha256]]){
   if(typeof name!=='string'||!digest||path.basename(name)!==name)throw Error('Invalid path/hash');
   const file=fs.realpathSync(path.join(dir,name));if(path.dirname(file)!==fs.realpathSync(dir))throw Error('Audio outside corpus');
   const b=fs.readFileSync(file);if(hash(b)!==digest)throw Error('Audio mismatch '+c.id);
  }
  const w=wavInfo(fs.readFileSync(path.join(dir,c.file)));if(w.channels!==1||w.sampleRate!==16000||w.bytes<=0)throw Error('Invalid PCM');
 }
 return manifest;
}
