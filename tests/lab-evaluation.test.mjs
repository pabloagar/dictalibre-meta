import test from 'node:test';
import assert from 'node:assert/strict';
import {score,csv} from '../backend/lab-core.mjs';
test('CER Unicode, normalización, ausentes y límites explícitos',()=>{
 assert.equal(score('NÓDULO.','nódulo').cer,0);
 assert.equal(score('3 mm','3 cm').characterErrors,1);
 assert.equal(score('3 mm','3 cm').cer,0.25);
 assert.equal(score(null,'x'),null);
 assert.equal(score('','x').cer,null);
 assert.equal(score('','x').characterErrors,1);
 assert.equal(score('a'.repeat(2100),'b'.repeat(2100)).cer,null);
});
test('CSV añade errores y referencia sin perder original ni formato',()=>{
 const out=csv([{text:'hay lesión',formattedText:'Hay lesión',evaluation:score('no hay lesión','hay lesión'),evaluationReferenceVersion:2}]);
 for(const field of ['substitutions','deletions','insertions','cer','referenceCharacters','evaluationReferenceVersion'])assert.ok(out.includes('"'+field+'"'));
 assert.ok(out.includes('hay lesión'));assert.ok(out.includes('Hay lesión'));
});
