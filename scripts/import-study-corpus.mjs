// Uploads synthetic corpus only; never starts ASR or Meta review and never assumes the script is a validated reference.
import fs from 'node:fs';
import path from 'node:path';
import {hash} from '../backend/lab-core.mjs';
const dir=path.resolve(process.argv[2]??'data/local/study-corpus-v1-utf8');
const base=process.argv[3]??'http://127.0.0.1:8789';
const url=new URL(base);if(url.hostname!=='127.0.0.1'||url.protocol!=='http:')throw Error('Solo laboratorio loopback.');
const output=path.join(dir,'import-'+Date.now()+'.json');
const manifestBytes=fs.readFileSync(path.join(dir,'manifest.json'));
const manifest=JSON.parse(manifestBytes.toString('utf8').replace(/^\uFEFF/,''));
if(manifest.source!=='local-synthetic-tts')throw Error('Se requiere corpus sintético local.');
const report={schema:'lab-corpus-import-v1',manifestHash:hash(manifestBytes),createdAt:new Date().toISOString(),server:base,results:[]};
try{for(const item of manifest.cases){
 const file=path.resolve(dir,item.file);if(path.dirname(file)!==dir)throw Error('Ruta fuera del corpus.');const bytes=fs.readFileSync(file);if(hash(bytes)!==item.sha256)throw Error('Hash de audio no coincide con manifiesto.');
 const res=await fetch(base+'/api/audio',{method:'POST',headers:{Origin:url.origin,'Content-Type':'audio/wav','X-File-Name':encodeURIComponent('SINTÉTICO '+item.id+'.wav')},body:bytes});const audio=await res.json();if(!res.ok)throw Error(audio.error);
 report.results.push({caseId:item.id,baseId:item.baseId,audioId:audio.id,audioHash:audio.sha256,variant:item.variant,referenceValidated:false});
}}catch(e){report.error=e.message;process.exitCode=1;}finally{fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(`${report.results.length} audios importados, sin inferencia ni referencia automática. Mapeo: ${output}`);}
