import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {saveMetaKey,loadMetaKey,checkMetaKey} from '../backend/meta-key.mjs';
test('clave persistente: reemplazo más corto, vaciado e inyección rechazada',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-key-')),file=path.join(dir,'.env.local');
 try{saveMetaKey(file,'test-only-long-key');assert.equal(loadMetaKey(file),'test-only-long-key');saveMetaKey(file,'short');assert.equal(loadMetaKey(file),'short');assert.ok(!fs.readFileSync(file,'utf8').includes('long-key'));assert.throws(()=>saveMetaKey(file,'value\nOTHER=bad'));assert.throws(()=>saveMetaKey(file,'Bearer key'));saveMetaKey(file,'');assert.equal(loadMetaKey(file),'');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('diagnóstico GET models no expone clave ni mensajes remotos arbitrarios',async()=>{
 const original=globalThis.fetch;let success=false;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.meta.ai/v1/models');assert.equal(options.headers.Authorization,'Bearer test-secret');return success?Response.json({data:[{id:'muse-voice-transcribe-1.0'}]}):Response.json({error:{type:'authentication_error',code:'invalid_api_key',message:'test-secret'}},{status:401});};
 try{const rejected=await checkMetaKey('test-secret');assert.equal(rejected.status,401);assert.equal(rejected.authenticated,false);assert.ok(!JSON.stringify(rejected).includes('test-secret'));success=true;assert.equal((await checkMetaKey('test-secret')).museListed,true);assert.equal((await checkMetaKey('')).errorCode,'missing_local_key');}finally{globalThis.fetch=original;}
});
