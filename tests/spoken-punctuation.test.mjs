import test from 'node:test';import assert from 'node:assert/strict';
import {applyFormatting} from '../backend/format-pipeline.mjs';
const run=(text,enabled=true)=>{const r={text,numbersEnabled:true,termsEnabled:true,commandsEnabled:true,timings:{},...(enabled?{punctuationMode:'explicit-commas-candidate'}:{})};applyFormatting(r);return r;};
test('candidate removes observed inserted commas and retains raw evidence',()=>{
 const raw='Neumoperitoneo, de pequeña cuantía, sin líquido libre, punto.';const r=run(raw);
 assert.equal(r.text,raw);assert.equal(r.formatting.text,'Neumoperitoneo de pequeña cuantía sin líquido libre.');assert.equal(r.punctuationFormatting.events.length,3);
});
test('candidate preserves explicit spoken comma and decimals, anatomical symbols and literal coma',()=>{
 for(const [a,b] of [['Lesión de 1,8 centímetros, coma, estable punto','Lesión de 1,8 centímetros, estable.'],['Paciente en coma inducido, punto','Paciente en coma inducido.'],['T1/T2, L4-L5, punto','T1/T2 L4-L5.']])assert.equal(run(a).formatting.text,b);
});
test('default behavior remains unchanged until candidate accepted',()=>{
 const r=run('No hay hemorragia, ni hidrocefalia punto',false);assert.equal(r.formatting.text,'No hay hemorragia, ni hidrocefalia.');assert.equal(r.punctuationFormatting,null);
});
test('known limitation is surfaced: ASR symbol may represent a spoken comma',()=>{
 const r=run('Derecho, izquierdo punto');assert.equal(r.formatting.text,'Derecho izquierdo.');assert.equal(r.punctuationFormatting.warnings[0].reason,'asr_may_have_consumed_spoken_comma');
});
