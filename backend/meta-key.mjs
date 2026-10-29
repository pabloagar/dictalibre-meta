import fs from 'node:fs';
import {parseEnv} from 'node:util';
export function loadMetaKey(file){
 if(fs.existsSync(file)){const values=parseEnv(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));if(Object.hasOwn(values,'META_API_KEY'))return values.META_API_KEY.trim();}
 return (process.env.META_API_KEY||process.env.MODEL_API_KEY||'').trim();
}
export function saveMetaKey(file,value){
 if(typeof value!=='string'||value.length>4096||/[\r\n\0]/.test(value))throw Error('Pega solo la clave completa, en una línea.');
 const key=value.trim();
 if(/^Bearer\s/i.test(key))throw Error('Pega la clave sola, sin la palabra Bearer.');
 // This dedicated file contains only the credential, never catalog data.
 const bytes=Buffer.from('# Dicta Libre: secreto local, excluido de Git.\nMETA_API_KEY='+JSON.stringify(key)+'\n');
 // Windows rejects opening an existing hidden file with the truncate flag.
 const fd=fs.openSync(file,fs.existsSync(file)?'r+':'w',0o600);
 try{fs.writeFileSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 return key;
}
export async function checkMetaKey(key){
 if(!key)return {status:null,authenticated:false,errorCode:'missing_local_key',models:[]};
 const started=performance.now();
 try{
  const response=await fetch('https://api.meta.ai/v1/models',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
  let body;try{body=await response.json();}catch{}
  const safe=v=>typeof v==='string'&&/^[a-zA-Z0-9_.-]{1,100}$/.test(v)?v:null;
  const models=Array.isArray(body?.data)?body.data.map(m=>safe(m.id)).filter(Boolean):[];
  return {status:response.status,authenticated:response.ok,elapsedMs:Math.round(performance.now()-started),errorType:safe(body?.error?.type),errorCode:safe(body?.error?.code),models,museListed:models.includes('muse-voice-transcribe-1.0')};
 }catch{return {status:null,authenticated:false,errorCode:'network_or_timeout',elapsedMs:Math.round(performance.now()-started),models:[]};}
}
