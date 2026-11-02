import test from 'node:test';
import assert from 'node:assert/strict';
import {formatNumbers} from '../backend/number-format.mjs';
import {formatDictation} from '../backend/dictation-commands.mjs';

test('colon singular de encabezado no se convierte en cifra; medidas reales permanecen',()=>{
 const format=s=>formatDictation(formatNumbers(s).text).text;
 assert.equal(format('hallazgos dos punto nueva línea pulmones bien expandidos punto'),'Hallazgos:\npulmones bien expandidos.');
 assert.equal(format('técnica dos punto nuevo párrafo sin contraste'),'Técnica:\n\nSin contraste');
 assert.equal(format('conclusión dos punto'),'Conclusión:');
 assert.equal(format('hallazgos dos punto cinco centímetros'),'Hallazgos 2,5 centímetros');
 assert.equal(format('nódulo de dos punto cinco milímetros punto'),'Nódulo de 2,5 milímetros.');
 assert.equal(format('hallazgos dos nódulos punto'),'Hallazgos 2 nódulos.');
 assert.equal(format('dos puntos ecogénicos'),'Dos puntos ecogénicos');
 assert.equal(format('hay dos puntos de sutura'),'Hay dos puntos de sutura');
 assert.equal(format('impresión dos puntos nueva línea sin cambios'),'Impresión:\nsin cambios');
 const r=formatDictation('hallazgos dos punto nueva línea sin cambios');assert.equal(r.events[0].spoken,'dos punto');assert.equal(r.events[0].replacement,':');assert.ok(r.elapsedMs>=0);
});
test('números radiológicos: cantidades, unidades y lateralidad',()=>{
 const original='un nódulo derecho de tres milímetros y un quiste de doce por ocho milímetros';
 const r=formatNumbers(original);assert.equal(r.text,'un nódulo derecho de 3 milímetros y un quiste de 12 por 8 milímetros');assert.equal(r.events.length,3);assert.equal(r.warnings.length,0);assert.ok(r.elapsedMs>=0);
 for(const e of r.events)assert.equal(original.slice(e.start,e.end),e.spoken);
});
test('decimales, ceros y comandos permanecen distinguibles',()=>{
 assert.equal(formatNumbers('dos coma cinco centímetros; diez coma dos; cero coma cero cinco; tres punto cinco').text,'2,5 centímetros; 10,2; 0,05; 3,5');
 assert.equal(formatDictation(formatNumbers('hallazgos dos puntos nódulo de dos coma cinco milímetros punto nueva línea sin derrame').text).text,'Hallazgos: nódulo de 2,5 milímetros.\nSin derrame');
 assert.equal(formatNumbers('3,5 mm y 12.5 cm; T3; 1,05').text,'3,5 mm y 12.5 cm; T3; 1,05');
});
test('cardinales compuestos válidos y expresiones no soportadas',()=>{
 assert.equal(formatNumbers('veintitrés; treinta y dos; ciento cinco; doscientos treinta y uno').text,'23; 32; 105; 231');
 const r=formatNumbers('dos mil quinientos; dos tres; cien cinco');assert.equal(r.text,'dos mil quinientos; dos tres; cien cinco');assert.equal(r.warnings.length,3);
 assert.equal(formatNumbers('No hay una lesión ni un derrame.').text,'No hay una lesión ni un derrame.');
 assert.equal(formatNumbers('dos coma seis cinco milímetros').text,'dos coma seis cinco milímetros');
 assert.equal(formatNumbers('dos coma seis cinco milímetros').warnings.length,1);
});
