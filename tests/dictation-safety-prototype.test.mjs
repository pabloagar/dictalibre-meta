import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessFormatting} from '../scripts/dictation-safety-prototype.mjs';
test('experiment source is UTF-8 and retains accented balanced hints',()=>{
 const s=new TextDecoder('utf-8',{fatal:true}).decode(fs.readFileSync(new URL('../scripts/evaluate-dictation-adjustments.mjs',import.meta.url)));
 for(const term of ['neumotórax','hemotórax','hemitórax'])assert.ok(s.includes(`'${term}'`));
 assert.ok(!s.includes('\ufffd'));
});
for(const [original,proposal] of [
 ['Hemotórax derecho punto','Neumotórax derecho.'],
 ['Neumotórax izquierdo punto','Hemotórax izquierdo.'],
 ['Sin derrame pleural punto','Derrame pleural.'],
 ['Lesión hipodensa punto','Lesión hiperdensa.'],
 ['Lesión izquierda punto','Lesión derecha.'],
 ['Lesión de cinco milímetros punto','Lesión de 50 milímetros.'],
 ['Lesión de cinco milímetros punto','Lesión de 5 centímetros.'],
 ['Derrame derecho y nódulo izquierdo punto','Nódulo derecho y derrame izquierdo.'],
 ['Aorta de calibre normal punto','Aorta de calibre normal. Sin aneurisma.'],
 ['Derrame derecho coma corrijo coma izquierdo punto','Derrame izquierdo.']
])test(`prototype requires acceptance for changed content: ${original}`,()=>{
 const r=assessFormatting(original,proposal);
 assert.equal(r.automatic,false);assert.equal(r.text,original);
 assert.equal(r.reason,'requires_explicit_acceptance');
});
for(const original of ['Cinco punto dos lesiones','Paciente en coma inducido punto','Dolor en el punto de punción punto'])test(`prototype preserves ambiguous original: ${original}`,()=>{
 const r=assessFormatting(original);assert.equal(r.automatic,false);assert.equal(r.text,original);assert.ok(r.warnings.length);
});
test('prototype permits explicit decimal formatting and preserves source',()=>{
 const r=assessFormatting('Nódulo de dos coma cinco milímetros punto');
 assert.equal(r.automatic,true);assert.equal(r.text,'Nódulo de 2,5 milímetros.');assert.equal(r.original,'Nódulo de dos coma cinco milímetros punto');
});
