import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {formatTerms} from '../backend/term-format.mjs';
import {formatNumbers} from '../backend/number-format.mjs';
import {formatDictation} from '../backend/dictation-commands.mjs';
import {createLab} from '../backend/lab.mjs';
const table=JSON.parse(fs.readFileSync(new URL('../data/vocabulario/formas-dictadas.v1.json',import.meta.url),'utf8'));
const pipeline=text=>formatDictation(formatTerms(formatNumbers(text).text).text).text;
function wav(){const b=Buffer.alloc(64044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(64000,40);return b;}

test('formas dictadas: casos de la tabla',()=>{
 assert.ok(table.pruebas.length>=10);
 for(const {entrada,esperado} of table.pruebas)assert.equal(formatTerms(entrada).text,esperado,entrada);
});
test('formas dictadas: cada forma de la tabla produce su forma escrita',()=>{
 for(const {escrito,dichos} of table.reemplazos)for(const dicho of dichos)assert.equal(formatTerms(dicho).text.toLowerCase(),escrito.toLowerCase(),dicho);
});
test('formas dictadas: auditoría con posiciones y formas ya correctas sin evento',()=>{
 const original='Control biurads y densidad de 35 unidades de Hounsfield.';
 const r=formatTerms(original);assert.equal(r.text,'Control BI-RADS y densidad de 35 UH.');assert.equal(r.events.length,2);
 for(const e of r.events)assert.equal(original.slice(e.start,e.end),e.spoken);
 assert.equal(formatTerms('BI-RADS 4A y LI-RADS.').events.length,0);
 assert.equal(formatTerms('bi-rads').text,'BI-RADS');
});
test('formas dictadas: no toca palabras parecidas, negaciones, lateralidad ni siglas ambiguas',()=>{
 for(const text of ['No hay sangrado activo a la derecha.','Volumen de 20 cc e IR conservado.','Hacia orad, radiografía normal.','Baltasar, tirad y resistencia.','Birdas y pirámide.'])assert.equal(formatTerms(text).text,text);
 for(const sigla of table.solo_con_contexto)assert.equal(formatTerms(sigla.toLowerCase()).text,sigla.toLowerCase());
});
test('flujo completo: números, términos y comandos',()=>{
 assert.equal(pipeline('categoría biurads cuatro a punto'),'Categoría BI-RADS 4A.');
 assert.equal(pipeline('densidad de treinta y cinco unidades de hounsfield punto'),'Densidad de 35 UH.');
 assert.equal(pipeline('quiste bosniak dos efe coma control'),'Quiste Bosniak IIF, control');
 assert.equal(pipeline('quiste bosniak tres punto'),'Quiste Bosniak III.');
 assert.equal(pipeline('nódulo birads cuatro a las diez'),'Nódulo BI-RADS 4 a las 10');
 assert.equal(pipeline('nódulo birads cuatro a en mama derecha'),'Nódulo BI-RADS 4A en mama derecha');
 assert.equal(pipeline('clasificación bosniak dos puntos quiste'),'Clasificación Bosniak: quiste');
});
test('laboratorio: conserva el original, audita, exporta y permite desactivar',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dicta-terms-'));
 const lab=createLab({dataDir:dir,keyFile:path.join(dir,'.env.local'),worker:{call:async m=>{fs.copyFileSync(m.input,m.output);},close(){}},reviewProvider:async()=>({content:'{"suggestions":[]}'}),muse:async()=>({text:'hallazgo biurads cuatro a'})});
 lab.server.listen(0,'127.0.0.1');await once(lab.server,'listening');const base=`http://127.0.0.1:${lab.server.address().port}`;
 const post=async(p,body)=>{const r=await fetch(base+p,{method:'POST',headers:{Origin:base},body:Buffer.isBuffer(body)?body:JSON.stringify(body)});assert.ok(r.ok);return r.json();};
 try{
  await post('/api/key',{key:'fixture'});const audio=await post('/api/audio',wav());const state=await (await fetch(base+'/api/state')).json();const config=state.configs.find(c=>c.engine==='muse');
  for(const termsEnabled of [true,false])await post('/api/runs',{audioIds:[audio.id],configIds:[config.id],repeats:1,commandsEnabled:false,numbersEnabled:true,reviewEnabled:false,termsEnabled});
  await post('/api/runs',{audioIds:[audio.id],configIds:[config.id],repeats:1,reviewEnabled:false});
  for(let i=0;i<200&&lab.db.runs.some(r=>['queued','running'].includes(r.status));i++)await new Promise(r=>setTimeout(r,10));
  const [on,off,standard]=(await (await fetch(base+'/api/export')).json()).runs;
  assert.equal(on.text,'hallazgo biurads cuatro a');assert.equal(off.text,on.text);
  assert.equal(on.termFormatting.text,'hallazgo BI-RADS 4A');assert.equal(on.termFormatting.input,'numberFormatting.text');assert.equal(on.termFormatting.events[0].spoken,'biurads 4 a');assert.equal(on.formatting,null);
  assert.equal(off.termFormatting,null);assert.equal(off.numberFormatting.text,'hallazgo biurads 4 a');assert.equal(off.timings.termFormatMs,0);
  assert.equal(standard.formatting.input,'termFormatting.text');assert.equal(standard.formatting.text,'Hallazgo BI-RADS 4A');
  const csv=await (await fetch(base+'/api/export?format=csv')).text();assert.ok(csv.includes('termText'));assert.ok(csv.includes('hallazgo BI-RADS 4A'));
 }finally{const closed=once(lab.server,'close');lab.close();await closed;fs.rmSync(dir,{recursive:true,force:true});}
});
