import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDictation} from '../backend/dictation-commands.mjs';
test('dictado: puntuación, párrafos y mayúscula sin cambiar hallazgos',()=>{
 const original='no hay derrame punto nueva línea nódulo derecho de 3 mm punto nuevo párrafo conclusión dos puntos sin cambios punto';
 const r=formatDictation(original);
 assert.equal(r.text,'No hay derrame.\nNódulo derecho de 3 mm.\n\nConclusión: sin cambios.');
 assert.equal(r.events.length,6);assert.ok(r.elapsedMs>=0);assert.equal(r.version,'es-basic-v2-heading-colon');
 assert.equal(original.includes('punto'),true);
});
test('evita duplicación de signos del ASR y reconoce frases completas primero',()=>{
 assert.equal(formatDictation('sin derrame. Punto. nuevo párrafo. nódulo, coma, estable punto y coma sin cambios punto.').text,'Sin derrame.\n\nNódulo, estable; sin cambios.');
 assert.equal(formatDictation('no hay derrame. Nódulo de 3,5 mm.').text,'No hay derrame. Nódulo de 3,5 mm.');
 assert.equal(formatDictation('apuntamiento y comatoso').events.length,0);
 assert.equal(formatDictation('conclusión 2 puntos sin cambios.').text,'Conclusión: sin cambios.');
});
test('decimales y usos literales quedan intactos y señalados',()=>{
 for(const text of ['3 punto cinco milímetros','tres coma cinco mm','3 punto cinco.','punto de sutura','en coma hepático','el punto doloroso','nueva línea de fractura','dos puntos ecogénicos']){
  const r=formatDictation(text);assert.equal(r.events.length,0);assert.equal(r.warnings.length,1);assert.equal(r.text.toLowerCase(),text);
 }
});
test('conserva saltos finales y admite comando solo y sin acento',()=>{
 assert.equal(formatDictation('nueva linea').text,'\n');
 assert.equal(formatDictation('nueva línea nueva línea').text,'\n\n');
 assert.equal(formatDictation('nuevo parrafo').text,'\n\n');
 assert.equal(formatDictation('').text,'');
 assert.equal(formatDictation('sin derrame nueva línea').text,'Sin derrame\n');
});
